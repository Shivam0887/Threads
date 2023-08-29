"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useRouter, usePathname } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { threadValidation } from "@/lib/validations/thread";
import { Textarea } from "../ui/textarea";
import { createThread } from "@/lib/actions/thread.actions";

interface Props {
  user: {
    id: string;
    objectId: string;
    username: string;
    name: string;
    bio: string;
    image: string;
  };
  btnTitle: string;
}

const PostThread = ({ id }: { id: string }) => {
  const router = useRouter();
  const pathName = usePathname();
  const { organization } = useOrganization();

  const form = useForm({
    resolver: zodResolver(threadValidation),
    defaultValues: {
      accountId: id,
      thread: "",
    },
  });

  const { control, handleSubmit } = form;

  const onSubmit = async (values: z.infer<typeof threadValidation>) => {
    await createThread({
      text: values.thread,
      author: id,
      communityId: organization ? organization.id : null,
      path: pathName,
    });

    router.push("/");
  };

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-10 flex flex-col justify-start gap-10"
      >
        <FormField
          control={control}
          name="thread"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-3 w-full">
              <FormLabel className="font-semibold text-gray-200">
                Content
              </FormLabel>
              <FormControl
                className="no-focus border border-dark-4
               bg-dark-3 text-light-1"
              >
                <Textarea rows={15} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="bg-primary-500">
          Post Thread
        </Button>
      </form>
    </Form>
  );
};

export default PostThread;
