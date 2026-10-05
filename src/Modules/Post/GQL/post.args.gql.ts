import { GraphQLID, GraphQLInt } from "graphql";

export const GetPosts = {
  postId: { type: GraphQLID },
  limit: { type: GraphQLInt },
  page: { type: GraphQLInt },
};
