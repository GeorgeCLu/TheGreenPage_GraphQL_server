// Import Apollo Azure integration library

const config = require('./utils/config');

const mongoose = require('mongoose')
const Listing = require('./models/listing')

// const MONGODB_URI = ''

const axios =require('axios');

// https://eva.pingutil.com/

const { ApolloServer, gql, UserInputError } = require('apollo-server-azure-functions');

const validateEmailService = async (emailToValidate) => {
    const queryUrl = 'https://api.eva.pingutil.com/email?email=' + emailToValidate//test@mail7.io'
    const response = await axios.get(queryUrl)
    console.log("validate email")
    console.log(emailToValidate)
    console.log(response.data.data.valid_syntax);
    console.log('----------------------------')
    return response.data.data.valid_syntax//rate;
};

console.log('connecting to', config.MONGODB_URI)

mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true}) //, useFindAndModify: false, useCreateIndex: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connecting to MongoDB:', error.message)
  })

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
    id: ID!
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
      console.log(args)
      if (!args.phone) {
        return Listing.find({})
      }
      return Listing.find({ phone: { $exists: args.phone === 'YES'  }})
    },
    findListing: (root, args) => Listing.findOne({ name: args.name }),
    findListingById: (root, args) => Listing.findById({ id: args.id })
  },
  Listing: {
    address: (root) => {
      return {
        street: root.street,
        city: root.city
      }
    }
  },
  Mutation: {
    addListing: async (root, args) => {
      const listing = new Listing({ ...args })
      await validateEmailService(listing.emailAddress).then(
        (valid) => {
          // console.log("email validated")
          // console.log(valid)
          // if (valid) {
            // console.log('valid')
          // }
          if (!valid){
           // console.log(" not valid")
            throw new UserInputError("invalid email", {
              invalidArgs: args,
            })
          }
        }
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
      // https://developer.okta.com/blog/2019/05/29/build-crud-nodejs-graphql
      try {
        // redundant - only for testing
        const deleted_Listing = Listing.findById({ id: args.id });
        // https://stackoverflow.com/questions/64717067/delete-from-mongodb-by-id
        await Listing.findByIdAndDelete({ id: args.id });
        // await listing.findByIdAndRemove(args.id)
        return deleted_Listing;
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },
    editNumber: async (root, args) => {
      const listing = await Listing.findOne({ name: args.name })
      listing.phone = args.phone
      try {
        await listing.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },
    editEmailAddress: async (root, args) => {
      const listing = await Listing.findOne({ name: args.name })
      listing.emailAddress = args.emailAddress
      await validateEmailService(args.emailAddress).then(
        (valid) => {
          //if (valid) {
            //console.log('valid')
          //}
          if (!valid){
           // console.log(" not valid")
            throw new UserInputError("invalid email", {
              invalidArgs: args,
            })
          }
        }
      );
      try {
        await listing.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },

    editListing: async (root, args) => {
      const listing = await Listing.findOne({ name: args.name })
      listing.phone = args.phone
      listing.street = args.street
      listing.city = args.city
      listing.emailAddress = args.emailAddress
      listing.category = args.category
      listing.description = args.description

      await validateEmailService(args.emailAddress).then(
        (valid) => {
          // if (valid) {
            // console.log('valid')
          // }
          if (!valid){
           // console.log(" not valid")
            throw new UserInputError("invalid email", {
              invalidArgs: args,
            })
          }
        }
      );
      try {
        await listing.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

// exports.graphqlHandler = server.createHandler();
module.exports = server.createHandler({
  cors: {
    origin: '*',
    credentials: false,
  },
});