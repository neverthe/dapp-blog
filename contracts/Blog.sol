// contracts/Blog.sol
// SPDX-License-Identifier: MIT
//开源协议标识
pragma solidity ^0.8.19;
//直接复用 OpenZeppelin 的“管理员”逻辑，后面只有 owner 能调用特定函数（当前合约里还没用到，但预留了）
import "@openzeppelin/contracts/access/Ownable.sol";

//用最小存储成本把文章元数据锚定在以太坊，同时通过事件和批量读取函数，让前端既能实时监听，又能高速加载列表。”
contract DecentralizedBlog is Ownable {
    //文章
    struct Post {
        uint256 id; //文章编号，全局自增，主键。
        address author; //作者地址，用来前端展示+后续权限扩展。
        string title; //链上标题，前端直接读，不用 IPFS。
        string contentHash; //正文+图片真正的 CID（IPFS 的 Qm... / bafy...），存在链上但内容在分布式网络。
        uint256 timestamp; //出块时间，用来排序/显示"多久前发布"。
        bool published; //软删除标志，后期可扩展"下架"功能，当前代码里一旦创建就 =true。
        string[] tags; //文章标签/分类，链上存储便于筛选
    }

    // 事件：链上日志,// indexed把 id 和 author 加上索引，可以按作者或文章号快速过滤日志
    //事件数据永久写在日志里前端 provider.getLogs(...) 即可抓取。
    event PostCreated(
        uint256 indexed id,
        address indexed author,
        string title,
        string contentHash,
        uint256 timestamp,
        string[] tags
    );

    // 状态变量
    //全局计数器，从 1 开始，避免和默认值 0 混淆
    uint256 private _nextPostId = 1;
    //核心映射，键是文章号，值是上面定义的 Post 结构体。
    mapping(uint256 => Post) private _posts;
    //动态数组，仅保存已发布文章的 id，前端想拉列表直接读它即可，不用遍历整个映射。
    uint256[] private _publishedPostIds;

    // 标签系统：标签 -> 该标签下的文章ID列表
    mapping(string => uint256[]) private _postsByTag;
    // 所有唯一标签列表
    string[] private _allTags;
    // 标签是否存在（用于去重）
    mapping(string => bool) private _tagExists;

    //继承自 Ownable 的构造函数，把部署者 msg.sender 设为 owner。
    constructor() Ownable(msg.sender) {}

    /**
     * @dev 创建新文章
     */
    //external：只允许从外部调用，比 public 省 gas
    function createPost(
        string memory _title,
        string memory _contentHash,
        string[] memory _tags
    ) external returns (uint256) {
        //条件不满足就回滚，并返回友好提示
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_contentHash).length > 0, "Content hash cannot be empty");
        //先取当前序号，再把计数器 +1
        uint256 postId = _nextPostId++;

        Post memory newPost = Post({
            id: postId,
            author: msg.sender,
            title: _title,
            contentHash: _contentHash,
            timestamp: block.timestamp, //当前出块时间
            published: true,
            tags: _tags
        });
        //根据ID存入映射的文章
        _posts[postId] = newPost;
        //已发布的动态数据
        _publishedPostIds.push(postId);

        // 注册标签
        _registerTags(postId, _tags);

        //触发事件，前端监听即可无刷新加载新文章。
        emit PostCreated(
            postId,
            msg.sender,
            _title,
            _contentHash,
            block.timestamp,
            _tags
        );
        //返回 postId，方便前端拿到后立即跳转到详情页。
        return postId;
    }

    /**
     * @dev 内部函数：注册标签到映射
     */
    function _registerTags(uint256 _postId, string[] memory _tags) internal {
        for (uint i = 0; i < _tags.length; i++) {
            string memory tag = _tags[i];
            if (bytes(tag).length > 0) {
                if (!_tagExists[tag]) {
                    _tagExists[tag] = true;
                    _allTags.push(tag);
                }
                _postsByTag[tag].push(_postId);
            }
        }
    }

    /**
     * @dev 获取文章详情
     */
    //单篇查询。view：只读，不消耗 gas
    /**
     * @dev 获取文章详情 - 返回结构体
     */
    function getPost(uint256 _postId) external view returns (Post memory) {
        Post memory post = _posts[_postId];
        require(post.id != 0, "Post does not exist");
        return post;
    }

    /**
     * @dev 获取所有已发布文章的ID
     */
    function getAllPostIds() external view returns (uint256[] memory) {
        return _publishedPostIds;
    }

    /**
     * @dev 获取文章数量
     */
    function getPostCount() external view returns (uint256) {
        return _publishedPostIds.length;
    }

    /**
     * @dev 获取多篇文章详情（用于前端批量显示）
     */
    //calldata：外部函数参数只读，比 memory 省 gas。
    //前端一次性传入 [1,2,3,...] 即可拿到批量数据，避免 N 次独立请求，提升加载速度。
    function getMultiplePosts(
        uint256[] calldata _postIds
    ) external view returns (Post[] memory) {
        //Post[]表示“元素类型是 Post 结构体的数组”。
        //memory把数组放在内存里，函数执行完就自动释放，不写链上存储，因此省 gas。
        //new 实例化一个数组。(_postIds.length)：立刻指定长度，一次性申请好内存座位，有多少个 id 就申请多少个
        Post[] memory posts = new Post[](_postIds.length);

        for (uint256 i = 0; i < _postIds.length; i++) {
            posts[i] = _posts[_postIds[i]];
        }

        return posts;
    }

    //只有文章作者可以编辑和删除自己的文章
    //所有重要操作都触发事件，方便前端监听
    // 定义文章更新事件
    event PostUpdated(
        uint256 indexed id,
        string newTitle,
        string newContentHash,
        string[] newTags
    );
    //定义文章删除事件
    event PostDeleted(uint256 indexed id);

    function updatePost(
        uint256 _postId,
        string memory _newTitle,
        string memory _newContentHash,
        string[] memory _newTags
    ) external {
        //从存储中获取文章引用（storage 表示直接修改链上数据）
        Post storage post = _posts[_postId];
        require(post.id != 0, "Post does not exist"); // 先检查存在性
        require(post.author == msg.sender, "Not the author"); // 后检查权限

        // 移除旧标签在 _postsByTag 中的关联
        for (uint i = 0; i < post.tags.length; i++) {
            string memory oldTag = post.tags[i];
            uint256[] storage tagPosts = _postsByTag[oldTag];
            for (uint j = 0; j < tagPosts.length; j++) {
                if (tagPosts[j] == _postId) {
                    tagPosts[j] = tagPosts[tagPosts.length - 1];
                    tagPosts.pop();
                    break;
                }
            }
        }

        post.title = _newTitle;
        post.contentHash = _newContentHash;

        // 清空旧标签并设置新标签
        while (post.tags.length > 0) {
            post.tags.pop();
        }
        for (uint i = 0; i < _newTags.length; i++) {
            post.tags.push(_newTags[i]);
        }

        // 注册新标签
        _registerTags(_postId, _newTags);

        //触发更新事件
        emit PostUpdated(_postId, _newTitle, _newContentHash, _newTags);
    }

    function deletePost(uint256 _postId) external {
        Post storage post = _posts[_postId];
        require(post.id != 0, "Post does not exist"); // 先检查存在性
        require(post.author == msg.sender, "Not the author"); // 后检查权限
        //将文章标记为未发布（软删除）.数据仍然保留在链上
        post.published = false;

        // 移除标签在 _postsByTag 中的关联
        for (uint i = 0; i < post.tags.length; i++) {
            string memory tag = post.tags[i];
            uint256[] storage tagPosts = _postsByTag[tag];
            for (uint j = 0; j < tagPosts.length; j++) {
                if (tagPosts[j] == _postId) {
                    tagPosts[j] = tagPosts[tagPosts.length - 1];
                    tagPosts.pop();
                    break;
                }
            }
        }

        // 从已发布ID数组中移除该文章ID
        for (uint i = 0; i < _publishedPostIds.length; i++) {
            if (_publishedPostIds[i] == _postId) {
                //用最后一个元素替换当前元素（Gas优化技巧）,移除最后一个元素
                _publishedPostIds[i] = _publishedPostIds[
                    _publishedPostIds.length - 1
                ];
                _publishedPostIds.pop();
                break;
            }
        }

        emit PostDeleted(_postId);
    }

    struct Comment {
        uint256 id; // 评论唯一ID
        uint256 postId; // 所属文章ID
        address author; // 评论唯一ID
        string content; // 评论内容
        uint256 timestamp; // 评论时间
    }

    // 在 Comment 结构体后面添加用户评论映射
    struct UserComment {
        uint256 postId;
        uint256 commentId;
        string content;
        uint256 timestamp;
    }

    // 添加用户评论映射
    mapping(address => UserComment[]) private _userComments;
    mapping(address => uint256) private _userCommentCount;

    //映射，键是文章ID，值是该文章下的评论数组
    mapping(uint256 => Comment[]) private _postComments;
    // 评论ID计数器，从1开始
    uint256 private _nextCommentId = 1;
    //定义评论添加事件
    event CommentAdded(
        uint256 indexed postId,
        uint256 commentId,
        address author,
        string content
    );

    // 在 addComment 函数中修改，添加用户评论记录
    function addComment(uint256 _postId, string memory _content) external {
        require(_posts[_postId].id != 0, "Post does not exist");
        require(bytes(_content).length > 0, "Comment cannot be empty");

        uint256 commentId = _nextCommentId++;

        Comment memory newComment = Comment({
            id: commentId,
            postId: _postId,
            author: msg.sender,
            content: _content,
            timestamp: block.timestamp
        });

        _postComments[_postId].push(newComment);

        // 新增：同时记录到用户评论映射中
        UserComment memory userComment = UserComment({
            postId: _postId,
            commentId: commentId,
            content: _content,
            timestamp: block.timestamp
        });

        _userComments[msg.sender].push(userComment);
        _userCommentCount[msg.sender]++;

        emit CommentAdded(_postId, commentId, msg.sender, _content);
    }

    // 添加获取用户评论的函数
    /**
     * @dev 获取用户的所有评论
     */
    function getUserComments(
        address _user
    ) external view returns (UserComment[] memory) {
        return _userComments[_user];
    }

    /**
     * @dev 获取用户的评论数量
     */
    function getUserCommentCount(
        address _user
    ) external view returns (uint256) {
        return _userCommentCount[_user];
    }

    // 点赞和关注都有防重复机制
    //嵌套映射，记录每篇文章的每个地址的点赞状态
    mapping(uint256 => mapping(address => bool)) private _postLikes;
    // 记录每篇文章的总点赞数
    mapping(uint256 => uint256) private _postLikeCounts;

    function likePost(uint256 _postId) external {
        require(!_postLikes[_postId][msg.sender], "Already liked");
        _postLikes[_postId][msg.sender] = true;
        _postLikeCounts[_postId]++;
    }

    //只读函数，返回指定文章的点赞总数
    function getLikeCount(uint256 _postId) external view returns (uint256) {
        return _postLikeCounts[_postId];
    }

    // 记录每个用户关注的所有人地址列表
    mapping(address => address[]) private _following;
    //快速检查用户A是否关注了用户B
    mapping(address => mapping(address => bool)) private _isFollowing;
    //定义用户关注事件
    event UserFollowed(address indexed follower, address indexed followed);

    //目标用户_userToFollow
    // 修改原有的 followUser 函数，添加粉丝管理
    function followUser(address _userToFollow) external {
        require(!_isFollowing[msg.sender][_userToFollow], "Already following");
        require(_userToFollow != msg.sender, "Cannot follow yourself");

        _following[msg.sender].push(_userToFollow);
        _isFollowing[msg.sender][_userToFollow] = true;

        // 添加到对方的粉丝列表
        _followers[_userToFollow].push(msg.sender);

        emit UserFollowed(msg.sender, _userToFollow);
    }

    /**
     * @dev 获取文章评论
     */
    function getComments(
        uint256 _postId
    ) external view returns (Comment[] memory) {
        return _postComments[_postId];
    }

    /**
     * @dev 检查用户是否点赞
     */
    function hasLiked(
        uint256 _postId,
        address _user
    ) external view returns (bool) {
        return _postLikes[_postId][_user];
    }

    /**
     * @dev 获取用户关注列表
     */
    function getFollowing(
        address _user
    ) external view returns (address[] memory) {
        return _following[_user];
    }

    /**
     * @dev 检查关注状态
     */
    function isFollowing(
        address _follower,
        address _followed
    ) external view returns (bool) {
        return _isFollowing[_follower][_followed];
    }

    // 添加粉丝相关映射
    mapping(address => address[]) private _followers; // 记录每个用户的粉丝列表

    // ... 现有的状态变量和函数保持不变 ...

    /**
     * @dev 检查是否是粉丝
     */
    function isFollower(
        address _user,
        address _follower
    ) external view returns (bool) {
        // 遍历粉丝列表检查
        address[] memory followers = _followers[_user];
        for (uint i = 0; i < followers.length; i++) {
            if (followers[i] == _follower) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev 获取用户点赞的文章ID列表
     */

    // 在合约中添加以下函数

    /**
     * @dev 获取用户点赞的文章ID列表
     */
    function getLikedPosts(
        address _user
    ) external view returns (uint256[] memory) {
        uint256[] memory likedPosts = new uint256[](_publishedPostIds.length);
        uint256 count = 0;

        for (uint i = 0; i < _publishedPostIds.length; i++) {
            uint256 postId = _publishedPostIds[i];
            if (_postLikes[postId][_user]) {
                likedPosts[count] = postId;
                count++;
            }
        }

        // 调整数组大小
        uint256[] memory result = new uint256[](count);
        for (uint i = 0; i < count; i++) {
            result[i] = likedPosts[i];
        }

        return result;
    }

    /**
     * @dev 获取用户的粉丝列表
     */
    function getFollowers(
        address _user
    ) external view returns (address[] memory) {
        return _followers[_user];
    }

    /**
     * @dev 获取粉丝数量
     */
    function getFollowerCount(address _user) external view returns (uint256) {
        return _followers[_user].length;
    }

    /**
     * @dev 取消关注用户
     */
    function unfollowUser(address _userToUnfollow) external {
        require(_isFollowing[msg.sender][_userToUnfollow], "Not following");

        // 从关注列表中移除
        address[] storage followingList = _following[msg.sender];
        for (uint i = 0; i < followingList.length; i++) {
            if (followingList[i] == _userToUnfollow) {
                followingList[i] = followingList[followingList.length - 1];
                followingList.pop();
                break;
            }
        }

        // 更新关注状态
        _isFollowing[msg.sender][_userToUnfollow] = false;

        emit UserUnfollowed(msg.sender, _userToUnfollow);
    }

    // 添加取消关注事件（在事件定义部分添加）
    event UserUnfollowed(address indexed follower, address indexed unfollowed);

    /**
     * @dev 获取所有标签
     */
    function getAllTags() external view returns (string[] memory) {
        return _allTags;
    }

    /**
     * @dev 获取标签数量
     */
    function getTagCount() external view returns (uint256) {
        return _allTags.length;
    }

    /**
     * @dev 获取某个标签下的文章ID列表
     */
    function getPostsByTag(string memory _tag) external view returns (uint256[] memory) {
        return _postsByTag[_tag];
    }
}
