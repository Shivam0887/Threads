"use server";

import { connectToDB } from "../mongoose";

import Thread from "@/lib/models/thread.model";
import User from "@/lib/models/user.model";
import Community from "@/lib/models/community.model";

import { revalidatePath } from "next/cache";

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

export async function createThread({
  text,
  author,
  communityId,
  path,
}: Params) {
  try {
    connectToDB();

    // Extracting the objectId for the created community
    const communityObjectId = await Community.findOne(
      { communityId },
      { _id: 1 }
    );

    const newThread = await Thread.create({
      text,
      author,
      communityId: communityObjectId?._id,
    });

    await User.findByIdAndUpdate(author, {
      $push: { threads: newThread._id },
    });

    if (communityObjectId) {
      await Community.findByIdAndUpdate(communityObjectId._id, {
        $push: { threads: newThread._id },
      });
    }

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Error while creating thread: ${error.message}`);
  }
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  try {
    connectToDB();

    // Calculate the number of posts/threads to skip
    const skipsCount = (pageNumber - 1) * pageSize;

    // Fetch those threads that have no parent, means they are the
    // actual threads/posts, not the comments. Because if a thread has a
    // parent this eventually means, that thread is a comment.
    const postQuery = Thread.find({ parentId: { $in: [null, undefined] } })
      .sort({ createdAt: "desc" })
      .skip(skipsCount)
      .limit(pageSize)
      .populate({ path: "author", model: User })
      .populate({ path: "communityId", model: Community })
      .populate({
        path: "children",
        populate: {
          path: "author",
          model: User,
          select: "_id name parentId image",
        },
      });

    const totalPosts = await Thread.countDocuments({
      parentId: { $in: [null, undefined] },
    });
    const posts = await postQuery.exec();

    const isNextPageAvailable = totalPosts > skipsCount + posts.length;

    return { posts, isNextPageAvailable };
  } catch (error: any) {
    console.log(`Failed to fetch posts: ${error.message}`);
  }
}

export async function fetchThreadById(id: string) {
  try {
    connectToDB();
    const thread = await Thread.findById(id)
      .populate({
        path: "author",
        model: User,
        select: "_id name userId image",
      })
      .populate({
        path: "children",
        populate: [
          {
            path: "author",
            model: User,
            select: "_id userId name parentId image",
          },
          {
            path: "children",
            model: Thread,
            populate: {
              path: "author",
              model: User,
              select: "_id userId name parentId image",
            },
          },
        ],
      })
      .exec();

    // .populate({
    //   path: "community",
    //   model: Community,
    //   select: "_id communityId name image",
    // })

    return thread;
  } catch (error: any) {
    console.log(`Failed to fetch a thread: ${error.message}`);
  }
}

export async function addCommentToThread(
  threadId: string,
  commentText: string,
  userId: string,
  path: string
) {
  try {
    connectToDB();
    const threadWithoutComment = await Thread.findById(threadId);
    if (!threadWithoutComment) throw new Error("Thread not found");

    const comment = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId,
    });

    const savedComment = await comment.save();
    threadWithoutComment.children.push(savedComment._id);
    await threadWithoutComment.save();

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Error while adding comment to thread: ${error.message}`);
  }
}

export async function fetchAllChildThreads(threadId: string): Promise<any[]> {
  const childThreads = await Thread.find({ parentId: threadId });

  const descendantThreads = [];
  for (const childThread of childThreads) {
    const descendants = await fetchAllChildThreads(childThread._id);
    descendantThreads.push(childThread, ...descendants);
  }

  return descendantThreads;
}

export async function deleteThread(id: string, path: string): Promise<void> {
  try {
    connectToDB();

    // Find the thread to be deleted (the main thread)
    const mainThread = await Thread.findById(id).populate("author community");

    if (!mainThread) {
      throw new Error("Thread not found");
    }

    // Fetch all child threads and their descendants recursively
    const descendantThreads = await fetchAllChildThreads(id);

    // Get all descendant thread IDs including the main thread ID and child thread IDs
    const descendantThreadIds = [
      id,
      ...descendantThreads.map((thread) => thread._id),
    ];

    // Extract the authorIds and communityIds to update User and Community models respectively
    const uniqueAuthorIds = new Set(
      [
        ...descendantThreads.map((thread) => thread.author?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainThread.author?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    const uniqueCommunityIds = new Set(
      [
        ...descendantThreads.map((thread) => thread.community?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainThread.community?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    // Recursively delete child threads and their descendants
    await Thread.deleteMany({ _id: { $in: descendantThreadIds } });

    // Update User model
    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { threads: { $in: descendantThreadIds } } }
    );

    // Update Community model
    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { threads: { $in: descendantThreadIds } } }
    );

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to delete thread: ${error.message}`);
  }
}
