import { fetchUserPosts } from "@/lib/actions/user.actions";
import React, { use } from "react";
import ThreadCard from "../cards/ThreadCard";
import { fetchCommunityPosts } from "@/lib/actions/community.actions";

type Props = {
  currentUserId: string;
  accountId: string;
  accountType: string;
};

const ThreadsTab = async ({ currentUserId, accountId, accountType }: Props) => {
  let result: any;
  if (accountType === "Community")
    result = await fetchCommunityPosts(accountId);
  else result = await fetchUserPosts(accountId);

  return (
    <section className="mt-9 flex flwx-col gap-10">
      {!result ? (
        <p className="text-light-2">No thread found</p>
      ) : (
        <>
          {result.threads.map((post: any) => (
            <ThreadCard
              key={post._id}
              id={post._id}
              currentUserId={result.userId}
              parentId={post.parentId}
              content={post.text}
              author={
                accountType === "User"
                  ? {
                      name: result.name,
                      image: result.image,
                      userId: result.userId,
                    }
                  : {
                      name: post.author.name,
                      image: post.author.image,
                      userId: post.author.userId,
                    }
              }
              community={post.communityId}
              createdAt={post.createdAt}
              comments={post.children}
            />
          ))}
        </>
      )}
    </section>
  );
};

export default ThreadsTab;
