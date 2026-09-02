import mongoose, { Schema, Types } from "mongoose";
import { IUser } from "./User.model";
import { PostEnum } from "../../Utils";

// ------------------------------ Post Model ------------------------------\\

// step 1 : create intercafe
export interface IPost {
  // ---- post content
  content?: string | undefined;
  attachments?: string[] | undefined;
  visibility?: PostEnum.VisibilityEnum | undefined;
  // ---- fileId > id of attachments s3 bucket
  fileId?: string | undefined;
  // ---- post / users actions to post
  tags?: string[] | IUser | string | undefined;
  likes?: string[] | IUser | string | undefined;
  // ---- actions By
  CreatedBy: Types.ObjectId | IUser | string;
  DeletedBy?: Types.ObjectId | IUser | string | undefined;
  // ---- actions At
  CreatedAt?: Date;
  UpdatedAt?: Date | undefined;
  DeletedAt?: Date | undefined;
}
export type HPostDocument = mongoose.HydratedDocument<IPost>;

// step 2 : create model Schema
const PostSchema = new Schema<IPost>(
  {
    content: {
      type: String,
      required: function (this: HPostDocument) {
        return !this.attachments?.length;
      },
    },
    attachments: {
      type: [String],
      max: [3, "max post attachment : 3 "],
      required: function (this: HPostDocument) {
        return !this.content;
      },
    },
    visibility: {
      type: String,
      enum: PostEnum.VisibilityEnum,
      default: PostEnum.VisibilityEnum.Public,
    },
    fileId: String,
    //
    likes: {
      type: [String],
      ref: "User",
      required: false,
    },
    tags: {
      type: [String],
      ref: "User",
      required: false,
    },
    //
    CreatedBy: {
      type: Types.ObjectId,
      ref: "User",
    },
    DeletedBy: Types.ObjectId,
    //
    CreatedAt: Date,
    DeletedAt: Date,
    UpdatedAt: Date,
  },
  {
    // strictPopulate: false,
    collection: "Post_Collection",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
  },
);

export const PostModel = mongoose.model<IPost>("Post", PostSchema);
