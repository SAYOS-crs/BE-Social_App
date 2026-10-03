import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { PostEnum } from "../../../Utils";

const GQLVisibilityEnumType = new GraphQLEnumType({
  name: "PostVisibility",
  values: {
    Friends: { value: PostEnum.VisibilityEnum.Friends },
    Private: { value: PostEnum.VisibilityEnum.Private },
    Public: { value: PostEnum.VisibilityEnum.Public },
  },
});

const likesType = new GraphQLObjectType({
  name: "likes",
  fields: {
    _id: { type: new GraphQLNonNull(GraphQLID) },
    react: { type: new GraphQLNonNull(GraphQLInt) },
  },
});

const OnePostType: GraphQLObjectType = new GraphQLObjectType({
  name: "OnePostType",
  fields() {
    return {
      _id: { type: new GraphQLNonNull(GraphQLID) },

      // refactors :
      // likes                                  (done)
      // fix ! IPost schema (capetal keys !!)   (done)
      // comment on list fileds *               (done)
      // create the User query                  ()
      // context  - auth - validation           (auth)  (context) ()

      content: { type: GraphQLString },
      attachments: { type: new GraphQLList(GraphQLString) },
      visibility: { type: GQLVisibilityEnumType },
      // ---- fileId > id of attachments s3 bucket
      fileId: { type: GraphQLString },
      // ---- post / users actions to post
      tags: { type: new GraphQLList(GraphQLID) },
      likes: {
        type: new GraphQLList(likesType),
      },
      // ---- actions By
      CreatedBy: { type: new GraphQLNonNull(GraphQLID) },
      DeletedBy: { type: GraphQLID },
      // ---- actions At
      createdAt: { type: new GraphQLNonNull(GraphQLString) },
      updatedAt: { type: GraphQLString },
      DeletedAt: { type: GraphQLString },
    };
  },
});

const metaData = new GraphQLObjectType({
  name: "metaData",
  fields: {
    count: { type: GraphQLInt },
    // posts count
    Page_Number: { type: GraphQLInt },
    // page number
    from: { type: GraphQLInt },
    // starting point
    to: { type: GraphQLInt },
  },
});

export const GetPosts = new GraphQLObjectType({
  name: "GetPostType",
  description: "",
  fields: {
    message: { type: GraphQLString },
    metaData: {
      type: metaData,
    },
    data: {
      // note : cuz the post will return as array of posts even if it one post
      type: new GraphQLList(OnePostType),
    },
  },
});
