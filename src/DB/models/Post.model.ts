import mongoose, { Schema, Types } from "mongoose";
import { IUser } from "./User.model";
import { PostEnum } from "../../Utils";

// ------------------------------ Post Model ------------------------------\\

// step 1 : create intercafe
interface IPost {
  // ---- post content
  content?: string;
  attachments: string[];
  visibility: PostEnum.VisibilityEnum;
  // ---- fileId > id of attachments s3 bucket
  fileId: string;
  // ---- post / users actions to post
  tags: Types.ObjectId[] | IUser;
  likes: Types.ObjectId[] | IUser;
  // ---- actions By
  CreatedBy: Types.ObjectId | IUser;
  DeletedBy?: Types.ObjectId | IUser;
  // ---- actions At
  CreatedAt: Date;
  UpdatedAt?: Date;
  DeletedAt?: Date;
}
export type HPostDocemnt = mongoose.HydratedDocument<IPost>;
// step 2 : create model Schema
const PostSchema = new Schema<HPostDocemnt>(
  {
    content: {
      type: String,
      required: function (this) {
        return !this.attachments.length;
      },
    },
    attachments: {
      type: [String],
      max: [3, "max post attachment : 3 "],
      required: function (this) {
        return !this.content;
      },
    },
    visibility: {
      type: Number,
      enum: PostEnum.VisibilityEnum,
      default: PostEnum.VisibilityEnum.Public,
    },
    fileId: String,
    //
    likes: {
      type: [String],
      ref: "User",
    },
    tags: {
      type: [String],
      ref: "User",
    },
    //
    CreatedBy: Types.ObjectId,
    DeletedBy: Types.ObjectId,
    //
    CreatedAt: Date,
    DeletedAt: Date,
    UpdatedAt: Date,
  },
  {
    collection: "Post_Collection",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
  },
);

export const PostModel = mongoose.model<HPostDocemnt>("Post", PostSchema);
