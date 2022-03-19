// Import Apollo Azure integration library

const mongoose = require('mongoose');
const axios = require('axios');

// connect to https://eva.pingutil.com/ for email validation

const {
  ApolloServer, gql, UserInputError, AuthenticationError,
} = require('apollo-server-azure-functions');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Listing = require('./models/listing');
const User = require('./models/user');
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

const createToken = async (user, secret, expiresIn) => {
  const { id, email, username } = user;
  // eslint-disable-next-line no-return-await
  return await jwt.sign({ id, email, username }, secret, {
    expiresIn,
  });
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
  me: User
}

type User {
  id: ID!
  username: String!
  email: String!
  listings: [Listing!]
}

type Token {
  token: String!
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
  signUp(
    username: String!
    email: String!
    password: String!
  ): Token!
  signIn(
    login: String!
    password: String!
  ): Token!
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

    signUp: async (
      parent,
      { username, email, password },
      { models, secret },
    ) => {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const user = new User({
        username,
        email,
        passwordHash,
      });

      const savedUser = await user.save();

      /*
      const user = await models.User.create({
        username,
        email,
        passwordHash,
      }); */

      return { token: createToken(savedUser, secret, '30m') };
    },

    signIn: async (
      parent,
      { login, password },
      // eslint-disable-next-line no-unused-vars
      { models, secret },
    ) => {
      const user = await User.findOne({ username: login });
      // await models.User.findByLogin(login);
      if (!user) {
        throw new UserInputError(
          'No user found with this login credentials.',
        );
      }

      const isValid = user === null
        ? false
        : await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        throw new AuthenticationError('Invalid password.');
      }

      return { token: createToken(user, secret, '30m') };
    },

  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), process.env.SECRET);
      const currentUser = await User.findById(decodedToken.id);
      return {
        currentUser,
        secret: process.env.SECRET,
      };
    }
    return {
      secret: process.env.SECRET,
    };
  },
});

// exports.graphqlHandler = server.createHandler();
module.exports = server.createHandler({
  cors: {
    origin: '*',
    credentials: false,
  },
});
