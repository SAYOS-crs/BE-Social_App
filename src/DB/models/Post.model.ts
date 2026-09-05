import mongoose, { Schema, Types } from "mongoose";
import { IUser } from "./User.model";
import { PostEnum } from "../../Utils";

// ------------------------------ Post Model ------------------------------\\
export type React = {
  _id: string | Types.ObjectId;
  react: PostEnum.PostReactEnum;
};
// step 1 : create intercafe
export interface IPost {
  // ---- post content
  _id: Types.ObjectId | string;
  content?: string | undefined;
  attachments?: string[] | undefined;
  visibility?: PostEnum.VisibilityEnum | undefined;
  // ---- fileId > id of attachments s3 bucket
  fileId?: string | undefined;
  // ---- post / users actions to post
  tags?: string | string[] | IUser | IUser[] | undefined;
  likes?: React | React[] | IUser | IUser[] | undefined;
  // ---- actions By
  CreatedBy: Types.ObjectId | IUser | string;
  DeletedBy?: Types.ObjectId | IUser | string | undefined;
  // ---- actions At
  CreatedAt: Date;
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
    fileId: String,

    visibility: {
      type: String,
      enum: PostEnum.VisibilityEnum,
      default: PostEnum.VisibilityEnum.Public,
    },
    //
    likes: {
      type: [
        {
          _id: {
            type: Types.ObjectId,
            ref: "User",
          },
          react: Number,
        },
      ],
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
    id: true,
    strict: true,
    strictQuery: true,
  },
);

// important nots :
//
// // general nots :-
// - note : _id taype of ObjectId / id type of string
// - you can active the id on the doc by id:true but it will be virtual mean you can't see it in mongoo campos
//
// // in likes the object inside :-
//  named it _id to overwrite the outo generate _id
// - and that to let the _id = user._id
// - if i dose't did that it will be like there an id and _id
// - _id will be outo generate becz mongoose gave any object _id by default
// - id will refrunce the user._id
//

export const PostModel = mongoose.model<IPost>("Post", PostSchema);
