// Import Apollo Azure integration library

const mongoose = require('mongoose');
const axios = require('axios');

// connect to https://eva.pingutil.com/ for email validation

const { ApolloServer, gql, UserInputError } = require('apollo-server-azure-functions');
const Listing = require('./models/listing');
const config = require('./utils/config');

const validateEmailService = async (emailToValidate) => {
  const queryUrl = `https://api.eva.pingutil.com/email?email=${emailToValidate}`;
  const response = await axios.get(queryUrl);
  // eslint-disable-next-line no-console
  console.log('validate email');
  // eslint-disable-next-line no-console
  console.log(emailToValidate);
  // eslint-disable-next-line no-console
  console.log(response.data.data.valid_syntax);
  // eslint-disable-next-line no-console
  console.log('----------------------------');
  return response.data.data.valid_syntax;
};

// eslint-disable-next-line no-console
console.log('connecting to', config.MONGODB_URI);

// connect to mopngo db
// unused parameters: , useFindAndModify: false, useCreateIndex: true })
mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('connected to MongoDB');
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.log('error connecting to MongoDB:', error.message);
  });

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
type Listing {
  name: String!
  phone: String
  emailAddress:String!
  category:String!
  description:String!
  address: Address!
  id: ID!
}

type Address {
  street: String!
  city: String! 
}

enum YesNo {
  YES
  NO
}

type Query {
  listingCount: Int!
  allListings(phone: YesNo): [Listing!]!
  findListing(name: String!): Listing
  findListingById(id: ID!): Listing
}

type User {
  id: ID!
  username: String!
  email: String!
  listings: [Listing!]
}

type Mutation {
  addListing(
    name: String!
    phone: String
    street: String!
    city: String!
    emailAddress: String!
    category:String!
    description:String!
  ): Listing
  deleteListing(
    name: String!
  ): Listing
  editNumber(
    name: String!
    phone: String!
  ): Listing
  editEmailAddress(
    name: String!
    emailAddress: String!
  ): Listing
  editListing(
    name: String!
    phone: String
    street: String!
    city: String!
    emailAddress: String!
    category:String!
    description:String!
  ): Listing
} 
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    listingCount: () => Listing.collection.countDocuments(),
    allListings: (root, args) => {
      // eslint-disable-next-line no-console
      console.log(args);
      if (!args.phone) {
        return Listing.find({});
      }
      return Listing.find({ phone: { $exists: args.phone === 'YES' } });
    },
    findListing: (root, args) => Listing.findOne({ name: args.name }),
    findListingById: (root, args) => Listing.findById({ id: args.id }),
  },
  Listing: {
    address: (root) => ({
      street: root.street,
      city: root.city,
    }),
  },
  Mutation: {
    addListing: async (root, args) => {
      const listing = new Listing({ ...args });
      await validateEmailService(listing.emailAddress).then(
        (valid) => {
          // console.log("email validated")
          // console.log(valid)
          // if (valid) {
          // console.log('valid')
          // }
          if (!valid) {
            // console.log(" not valid")
            throw new UserInputError('invalid email', {
              invalidArgs: args,
            });
          }
        },
      );
      try {
        // console.log('saving')
        await listing.save();
        return Listing.findOne({ name: args.name });
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
    },
    deleteListing: async (root, args) => {
      try {
        // return deleted Listing for testing
        return await Listing.findOneAndDelete({ name: args.name });
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
    },
    editNumber: async (root, args) => {
      const listing = await Listing.findOne({ name: args.name });
      listing.phone = args.phone;
      try {
        await listing.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
    },
    editEmailAddress: async (root, args) => {
      const listing = await Listing.findOne({ name: args.name });
      listing.emailAddress = args.emailAddress;
      await validateEmailService(args.emailAddress).then(
        (valid) => {
          // if (valid) {
          // console.log('valid')
          // }
          if (!valid) {
            // console.log(" not valid")
            throw new UserInputError('invalid email', {
              invalidArgs: args,
            });
          }
        },
      );
      try {
        await listing.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
    },

    editListing: async (root, args) => {
      const listing = await Listing.findOne({ name: args.name });
      listing.phone = args.phone;
      listing.street = args.street;
      listing.city = args.city;
      listing.emailAddress = args.emailAddress;
      listing.category = args.category;
      listing.description = args.description;

      await validateEmailService(args.emailAddress).then(
        (valid) => {
          // if (valid) {
          // console.log('valid')
          // }
          if (!valid) {
            // console.log(" not valid")
            throw new UserInputError('invalid email', {
              invalidArgs: args,
            });
          }
        },
      );
      try {
        await listing.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

// exports.graphqlHandler = server.createHandler();
module.exports = server.createHandler({
  cors: {
    origin: '*',
    credentials: false,
  },
});
