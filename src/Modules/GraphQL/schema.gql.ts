import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { GQLPostSchema } from "../Post";

// ** GraphQL Step 3 : create query + mutation
const query = new GraphQLObjectType({
  name: "GQLQueryRoot",
  description: "QueryRootSocailApp",
  fields: {
    // ** GraphQL Step 4 : create filed
    ...GQLPostSchema.RegisterQuery,
  },
});

// const mutation = new GraphQLObjectType({
//   name: "GQLMutationRoot",
//   fields: {},
// });

// ** GraphQL Step 2 : create schema
const schema = new GraphQLSchema({ query });
export default schema;
