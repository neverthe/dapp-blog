// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract DecentralizedBlog is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    //文章
    struct Post {
        uint256 id;
        address author;
        string title;
        string contentHash;
        uint256 timestamp;
        bool published;
        string[] tags;
    }

    event PostCreated(
        uint256 indexed id,
        address indexed author,
        string title,
        string contentHash,
        uint256 timestamp,
        string[] tags
    );

    // 状态变量
    uint256 private _nextPostId;
    mapping(uint256 => Post) private _posts;
    uint256[] private _publishedPostIds;

    // 标签系统
    mapping(string => uint256[]) private _postsByTag;
    string[] private _allTags;
    mapping(string => bool) private _tagExists;

    // 评论
    struct Comment {
        uint256 id;
        uint256 postId;
        address author;
        string content;
        uint256 timestamp;
    }

    struct UserComment {
        uint256 postId;
        uint256 commentId;
        string content;
        uint256 timestamp;
    }

    mapping(address => UserComment[]) private _userComments;
    mapping(address => uint256) private _userCommentCount;
    mapping(uint256 => Comment[]) private _postComments;
    uint256 private _nextCommentId;

    event CommentAdded(
        uint256 indexed postId,
        uint256 commentId,
        address author,
        string content
    );

    // 点赞
    mapping(uint256 => mapping(address => bool)) private _postLikes;
    mapping(uint256 => uint256) private _postLikeCounts;

    // 关注
    mapping(address => address[]) private _following;
    mapping(address => mapping(address => bool)) private _isFollowing;
    mapping(address => address[]) private _followers;

    event UserFollowed(address indexed follower, address indexed followed);
    event UserUnfollowed(address indexed follower, address indexed unfollowed);

    // 阅读量
    mapping(uint256 => uint256) private _viewCounts;

    // 文章事件
    event PostUpdated(
        uint256 indexed id,
        string newTitle,
        string newContentHash,
        string[] newTags
    );
    event PostDeleted(uint256 indexed id);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __Ownable_init(msg.sender);
        _nextPostId = 1;
        _nextCommentId = 1;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev 创建新文章
     */
    function createPost(
        string memory _title,
        string memory _contentHash,
        string[] memory _tags
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_contentHash).length > 0, "Content hash cannot be empty");

        uint256 postId = _nextPostId++;

        Post memory newPost = Post({
            id: postId,
            author: msg.sender,
            title: _title,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            published: true,
            tags: _tags
        });

        _posts[postId] = newPost;
        _publishedPostIds.push(postId);
        _registerTags(postId, _tags);

        emit PostCreated(postId, msg.sender, _title, _contentHash, block.timestamp, _tags);
        return postId;
    }

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

    function getPost(uint256 _postId) external view returns (Post memory) {
        Post memory post = _posts[_postId];
        require(post.id != 0, "Post does not exist");
        return post;
    }

    function getAllPostIds() external view returns (uint256[] memory) {
        return _publishedPostIds;
    }

    function getPostCount() external view returns (uint256) {
        return _publishedPostIds.length;
    }

    function getMultiplePosts(uint256[] calldata _postIds) external view returns (Post[] memory) {
        Post[] memory posts = new Post[](_postIds.length);
        for (uint256 i = 0; i < _postIds.length; i++) {
            posts[i] = _posts[_postIds[i]];
        }
        return posts;
    }

    function updatePost(
        uint256 _postId,
        string memory _newTitle,
        string memory _newContentHash,
        string[] memory _newTags
    ) external {
        Post storage post = _posts[_postId];
        require(post.id != 0, "Post does not exist");
        require(post.author == msg.sender, "Not the author");

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

        while (post.tags.length > 0) {
            post.tags.pop();
        }
        for (uint i = 0; i < _newTags.length; i++) {
            post.tags.push(_newTags[i]);
        }

        _registerTags(_postId, _newTags);
        emit PostUpdated(_postId, _newTitle, _newContentHash, _newTags);
    }

    function deletePost(uint256 _postId) external {
        Post storage post = _posts[_postId];
        require(post.id != 0, "Post does not exist");
        require(post.author == msg.sender, "Not the author");

        post.published = false;

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

        for (uint i = 0; i < _publishedPostIds.length; i++) {
            if (_publishedPostIds[i] == _postId) {
                _publishedPostIds[i] = _publishedPostIds[_publishedPostIds.length - 1];
                _publishedPostIds.pop();
                break;
            }
        }

        emit PostDeleted(_postId);
    }

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

    function getComments(uint256 _postId) external view returns (Comment[] memory) {
        return _postComments[_postId];
    }

    function getUserComments(address _user) external view returns (UserComment[] memory) {
        return _userComments[_user];
    }

    function getUserCommentCount(address _user) external view returns (uint256) {
        return _userCommentCount[_user];
    }

    function likePost(uint256 _postId) external {
        require(!_postLikes[_postId][msg.sender], "Already liked");
        _postLikes[_postId][msg.sender] = true;
        _postLikeCounts[_postId]++;
    }

    function getLikeCount(uint256 _postId) external view returns (uint256) {
        return _postLikeCounts[_postId];
    }

    function hasLiked(uint256 _postId, address _user) external view returns (bool) {
        return _postLikes[_postId][_user];
    }

    function getLikedPosts(address _user) external view returns (uint256[] memory) {
        uint256[] memory likedPosts = new uint256[](_publishedPostIds.length);
        uint256 count = 0;
        for (uint i = 0; i < _publishedPostIds.length; i++) {
            uint256 postId = _publishedPostIds[i];
            if (_postLikes[postId][_user]) {
                likedPosts[count] = postId;
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint i = 0; i < count; i++) {
            result[i] = likedPosts[i];
        }
        return result;
    }

    function followUser(address _userToFollow) external {
        require(!_isFollowing[msg.sender][_userToFollow], "Already following");
        require(_userToFollow != msg.sender, "Cannot follow yourself");

        _following[msg.sender].push(_userToFollow);
        _isFollowing[msg.sender][_userToFollow] = true;
        _followers[_userToFollow].push(msg.sender);

        emit UserFollowed(msg.sender, _userToFollow);
    }

    function unfollowUser(address _userToUnfollow) external {
        require(_isFollowing[msg.sender][_userToUnfollow], "Not following");

        address[] storage followingList = _following[msg.sender];
        for (uint i = 0; i < followingList.length; i++) {
            if (followingList[i] == _userToUnfollow) {
                followingList[i] = followingList[followingList.length - 1];
                followingList.pop();
                break;
            }
        }

        _isFollowing[msg.sender][_userToUnfollow] = false;
        emit UserUnfollowed(msg.sender, _userToUnfollow);
    }

    function getFollowing(address _user) external view returns (address[] memory) {
        return _following[_user];
    }

    function isFollowing(address _follower, address _followed) external view returns (bool) {
        return _isFollowing[_follower][_followed];
    }

    function getFollowers(address _user) external view returns (address[] memory) {
        return _followers[_user];
    }

    function getFollowerCount(address _user) external view returns (uint256) {
        return _followers[_user].length;
    }

    function isFollower(address _user, address _follower) external view returns (bool) {
        address[] memory followers = _followers[_user];
        for (uint i = 0; i < followers.length; i++) {
            if (followers[i] == _follower) return true;
        }
        return false;
    }

    function incrementViewCount(uint256 _postId) external {
        require(_posts[_postId].id != 0, "Post does not exist");
        _viewCounts[_postId]++;
    }

    function getViewCount(uint256 _postId) external view returns (uint256) {
        return _viewCounts[_postId];
    }

    function getAllTags() external view returns (string[] memory) {
        return _allTags;
    }

    function getTagCount() external view returns (uint256) {
        return _allTags.length;
    }

    function getPostsByTag(string memory _tag) external view returns (uint256[] memory) {
        return _postsByTag[_tag];
    }
}
