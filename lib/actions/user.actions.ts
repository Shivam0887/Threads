"use server";

import { connectToDB } from "../mongoose";
import User from "../models/user.model";
import { revalidatePath } from "next/cache";
import Thread from "../models/thread.model";
import { FilterQuery, SortOrder } from "mongoose";

interface Props {
  userId: string;
  username: string;
  name: string;
  bio: string;
  image: string;
  path: string;
}

interface searchProps {
  userId: string;
  searchString?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: SortOrder;
}

export async function updateUser({
  userId,
  username,
  name,
  bio,
  image,
  path,
}: Props): Promise<void> {
  connectToDB();

  try {
    await User.findOneAndUpdate(
      { userId },
      {
        userId,
        username: username.toLowerCase(),
        name,
        bio,
        image,
        onboarded: true,
      },
      {
        upsert: true,
      }
    );

    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error) {
    console.log(`Failed to create/update user, ${error}`);
  }
}

export async function fetchUser(userId: string) {
  try {
    connectToDB();
    return await User.findOne({ userId });
    // .populate({
    //   path: 'communities',
    //   model: 'Community'
    // })
  } catch (error: any) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}

export async function fetchUserPosts(userId: string) {
  try {
    connectToDB();
    const userThreads = await User.findOne({ userId })
      .populate({
        path: "threads",
        model: Thread,
        populate: {
          path: "children",
          model: Thread,
          populate: {
            path: "author",
            model: User,
            select: "name image userId",
          },
        },
      })
      .exec();

    return userThreads;
  } catch (error: any) {
    console.log(`Failed to fetch userThreads: ${error.message}`);
  }
}

export async function fetchUsers({
  userId,
  searchString = "",
  pageNumber = 1,
  pageSize = 20,
  sortBy = "desc",
}: searchProps) {
  try {
    connectToDB();

    const skipCount = (pageNumber - 1) * pageSize;
    searchString = searchString.trim();
    const regex = new RegExp(searchString, "i");

    const query: FilterQuery<typeof User> = { userId: { $ne: userId } };

    if (searchString !== "") {
      query.$or = [
        { username: { $regex: regex } },
        { name: { $regex: regex } },
      ];
    }

    const sortOptions = { createdAt: sortBy };
    const userQuery = User.findOne(query)
      .sort(sortOptions)
      .skip(skipCount)
      .limit(pageSize);

    const totalUsersCount = await User.countDocuments(query);
    const users = await userQuery.exec();

    const isNextPageAvailable = totalUsersCount > skipCount + users?.length;

    return { users, isNextPageAvailable };
  } catch (error: any) {
    console.log(`Failed to search users : ${error.message}`);
  }
}

export async function getActivity(userId: string) {
  try {
    connectToDB();

    // find all the threads created by the user
    const userThreads = await Thread.find({ author: userId });

    // Collect all the child thread id's (replies) from the children field
    const childThreadIDs = userThreads.reduce((acc, userThread) => {
      return acc.concat(userThread.children);
    }, []);

    const replies = await Thread.find({
      _id: { $in: childThreadIDs },
      author: { $ne: userId },
    }).populate({
      path: "author",
      model: User,
      select: "name image _id",
    });

    return replies;
  } catch (error: any) {
    console.log(`Failed to get the activities: ${error.message}`);
  }
}
