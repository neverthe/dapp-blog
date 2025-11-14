// test/Blog.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DecentralizedBlog", function () {
  let blog;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const Blog = await ethers.getContractFactory("DecentralizedBlog");
    blog = await Blog.deploy();
    await blog.waitForDeployment();
  });

  describe("文章功能", function () {
 

    it("创建文章应该增加文章数量", async function () {
      expect(await blog.getPostCount()).to.equal(0);
      
      await blog.connect(user1).createPost("标题1", "hash1");
      expect(await blog.getPostCount()).to.equal(1);
      
      await blog.connect(user2).createPost("标题2", "hash2");
      expect(await blog.getPostCount()).to.equal(2);
    });

    it("应该能获取所有文章ID", async function () {
      await blog.connect(user1).createPost("标题1", "hash1");
      await blog.connect(user2).createPost("标题2", "hash2");
      
      const postIds = await blog.getAllPostIds();
      expect(postIds).to.deep.equal([1, 2]);
    });

    it("应该能批量获取文章", async function () {
      await blog.connect(user1).createPost("标题1", "hash1");
      await blog.connect(user2).createPost("标题2", "hash2");
      
      const posts = await blog.getMultiplePosts([1, 2]);
      expect(posts.length).to.equal(2);
      expect(posts[0].title).to.equal("标题1");
      expect(posts[1].title).to.equal("标题2");
    });

    it("不能创建空标题的文章", async function () {
      await expect(
        blog.connect(user1).createPost("", "hash1")
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("不能创建空内容哈希的文章", async function () {
      await expect(
        blog.connect(user1).createPost("标题", "")
      ).to.be.revertedWith("Content hash cannot be empty");
    });

    it("应该能编辑自己的文章", async function () {
      await blog.connect(user1).createPost("原标题", "原哈希");
      
      await expect(blog.connect(user1).updatePost(1, "新标题", "新哈希"))
        .to.emit(blog, "PostUpdated")
        .withArgs(1, "新标题", "新哈希");
      
      const post = await blog.getPost(1);
      expect(post.title).to.equal("新标题");
      expect(post.contentHash).to.equal("新哈希");
    });

    it("不能编辑不存在的文章", async function () {
      await expect(
        blog.connect(user1).updatePost(999, "新标题", "新哈希")
      ).to.be.revertedWith("Post does not exist");
    });

    it("不能编辑别人的文章", async function () {
      await blog.connect(user1).createPost("标题", "哈希");
      
      await expect(
        blog.connect(user2).updatePost(1, "新标题", "新哈希")
      ).to.be.revertedWith("Not the author");
    });

    it("应该能删除自己的文章", async function () {
      await blog.connect(user1).createPost("标题", "哈希");
      expect(await blog.getPostCount()).to.equal(1);
      
      await expect(blog.connect(user1).deletePost(1))
        .to.emit(blog, "PostDeleted")
        .withArgs(1);
      
      expect(await blog.getPostCount()).to.equal(0);
      
      // 文章数据仍然存在，只是标记为未发布
      const post = await blog.getPost(1);
      expect(post.published).to.equal(false);
    });

    it("不能删除不存在的文章", async function () {
      await expect(
        blog.connect(user1).deletePost(999)
      ).to.be.revertedWith("Post does not exist");
    });

    it("不能删除别人的文章", async function () {
      await blog.connect(user1).createPost("标题", "哈希");
      
      await expect(
        blog.connect(user2).deletePost(1)
      ).to.be.revertedWith("Not the author");
    });
  });

  describe("评论功能", function () {
    beforeEach(async function () {
      await blog.connect(user1).createPost("测试文章", "hash1");
    });

    it("应该能添加评论", async function () {
      await expect(blog.connect(user2).addComment(1, "测试评论内容"))
        .to.emit(blog, "CommentAdded")
        .withArgs(1, 1, user2.address, "测试评论内容");
      
      const comments = await blog.getComments(1);
      expect(comments.length).to.equal(1);
      expect(comments[0].content).to.equal("测试评论内容");
      expect(comments[0].author).to.equal(user2.address);
    });

    it("应该记录用户评论", async function () {
      await blog.connect(user2).addComment(1, "评论内容");
      
      const userComments = await blog.getUserComments(user2.address);
      expect(userComments.length).to.equal(1);
      expect(userComments[0].content).to.equal("评论内容");
      expect(userComments[0].postId).to.equal(1);
      
      expect(await blog.getUserCommentCount(user2.address)).to.equal(1);
    });

    it("不能对不存在的文章添加评论", async function () {
      await expect(
        blog.connect(user2).addComment(999, "评论内容")
      ).to.be.revertedWith("Post does not exist");
    });

    it("不能添加空评论", async function () {
      await expect(
        blog.connect(user2).addComment(1, "")
      ).to.be.revertedWith("Comment cannot be empty");
    });
  });

  describe("点赞功能", function () {
    beforeEach(async function () {
      await blog.connect(user1).createPost("测试文章", "hash1");
    });

    it("应该能点赞文章", async function () {
      await blog.connect(user2).likePost(1);
      
      expect(await blog.getLikeCount(1)).to.equal(1);
      expect(await blog.hasLiked(1, user2.address)).to.equal(true);
    });

    it("不能重复点赞", async function () {
      await blog.connect(user2).likePost(1);
      
      await expect(
        blog.connect(user2).likePost(1)
      ).to.be.revertedWith("Already liked");
    });

    it("应该能获取用户点赞的文章", async function () {
      await blog.connect(user1).createPost("文章2", "hash2");
      
      await blog.connect(user2).likePost(1);
      await blog.connect(user2).likePost(2);
      
      const likedPosts = await blog.getLikedPosts(user2.address);
      expect(likedPosts).to.deep.equal([1, 2]);
    });
  });

  describe("关注功能", function () {
    it("应该能关注用户", async function () {
      await expect(blog.connect(user1).followUser(user2.address))
        .to.emit(blog, "UserFollowed")
        .withArgs(user1.address, user2.address);
      
      expect(await blog.isFollowing(user1.address, user2.address)).to.equal(true);
      
      const following = await blog.getFollowing(user1.address);
      expect(following).to.deep.equal([user2.address]);
    });

    it("关注应该添加到对方粉丝列表", async function () {
      await blog.connect(user1).followUser(user2.address);
      
      const followers = await blog.getFollowers(user2.address);
      expect(followers).to.deep.equal([user1.address]);
      expect(await blog.getFollowerCount(user2.address)).to.equal(1);
    });

    it("不能关注自己", async function () {
      await expect(
        blog.connect(user1).followUser(user1.address)
      ).to.be.revertedWith("Cannot follow yourself");
    });

    it("不能重复关注", async function () {
      await blog.connect(user1).followUser(user2.address);
      
      await expect(
        blog.connect(user1).followUser(user2.address)
      ).to.be.revertedWith("Already following");
    });

    it("应该能取消关注", async function () {
      await blog.connect(user1).followUser(user2.address);
      
      await expect(blog.connect(user1).unfollowUser(user2.address))
        .to.emit(blog, "UserUnfollowed")
        .withArgs(user1.address, user2.address);
      
      expect(await blog.isFollowing(user1.address, user2.address)).to.equal(false);
      
      const following = await blog.getFollowing(user1.address);
      expect(following.length).to.equal(0);
    });

    it("不能取消未关注的用户", async function () {
      await expect(
        blog.connect(user1).unfollowUser(user2.address)
      ).to.be.revertedWith("Not following");
    });
  });

  describe("粉丝功能", function () {
    it("应该能检查粉丝关系", async function () {
      await blog.connect(user1).followUser(user2.address);
      
      expect(await blog.isFollower(user2.address, user1.address)).to.equal(true);
      expect(await blog.isFollower(user2.address, user2.address)).to.equal(false);
    });
  });

  // 辅助函数
  async function getCurrentTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }
});