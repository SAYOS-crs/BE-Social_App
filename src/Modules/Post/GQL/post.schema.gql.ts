import * as PostArgs from "./post.args.gql";
import postResolver from "./post.resolver";
import { GetPosts } from "./post.type.gql";
// ** GraphQL Step 5 : create  module schema that contains
// 1- RegisterQuery / RegisterMutation
// 2- RegisterQuery or RegisterMutation contains fileds
// 3- every fild contains type / args? / resolver
// 4- resolver from module.resolver.ts  /  type from module.type.gql.ts

class GQLPostSchema {
  constructor() {}

  public RegisterQuery = {
    GetPosts: {
      type: GetPosts,
      args: PostArgs.GetPosts,
      // super note : commen mistake to type resolver instad of resolve !
      resolve: postResolver.GetPosts,
    },
  };
}

export default new GQLPostSchema();
