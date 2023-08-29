import { Schema, model, models } from "mongoose";

const threadSchema = new Schema({
  text: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  communityId: {
    type: Schema.Types.ObjectId,
    ref: "Community",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  parentId: {
    // If the thread is a comment
    type: String,
  },
  children: [
    {
      type: Schema.Types.ObjectId,
      ref: "Thread",
    },
  ],
});

const Thread = models.Thread || model("Thread", threadSchema);
export default Thread;
