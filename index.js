const { ApolloServer, UserInputError, gql } = require('apollo-server')
const { v1: uuid } = require('uuid')

const config = require('./utils/config');

const mongoose = require('mongoose')
const Person = require('./models/person')

// const MONGODB_URI = ''

const axios =require('axios');

// https://eva.pingutil.com/

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

mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connecting to MongoDB:', error.message)
  })

const typeDefs = gql`
  type Person {
    name: String!
    phone: String
    emailAddress:String!
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
    personCount: Int!
    allPersons(phone: YesNo): [Person!]!
    findPerson(name: String!): Person
    findPersonById(id: ID!): Person
  }

  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
      emailAddress: String!
    ): Person
    deletePerson(
      id: ID!
    ): Person
    editNumber(
      name: String!
      phone: String!
    ): Person
    editEmailAddress(
      name: String!
      emailAddress: String!
    ): Person
    editPerson(
      name: String!
      phone: String
      street: String!
      city: String!
      emailAddress: String!
    ): Person
  }  
`

const resolvers = {
  Query: {
    personCount: () => Person.collection.countDocuments(),
    allPersons: (root, args) => {
      if (!args.phone) {
        return Person.find({})
      }
      return Person.find({ phone: { $exists: args.phone === 'YES'  }})
    },
    findPerson: (root, args) => Person.findOne({ name: args.name }),
    findPersonById: (root, args) => Person.findById({ id: args.id })
  },
  Person: {
    address: (root) => {
      return {
        street: root.street,
        city: root.city
      }
    }
  },
  Mutation: {
    addPerson: async (root, args) => {
      const person = new Person({ ...args })
      await validateEmailService(person.emailAddress).then(
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
        await person.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },
    deletePerson: async (root, args) => {
      // console.log("deleteperson")
      try {
        await person.findByIdAndRemove(args.id)
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },
    editNumber: async (root, args) => {
      const person = await Person.findOne({ name: args.name })
      person.phone = args.phone
      try {
        await person.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },
    editEmailAddress: async (root, args) => {
      const person = await Person.findOne({ name: args.name })
      person.emailAddress = args.emailAddress
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
        await person.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },

    editPerson: async (root, args) => {
      const person = await Person.findOne({ name: args.name })
      person.phone = args.phone
      person.street = args.street
      person.city = args.city
      person.emailAddress = args.emailAddress

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
        await person.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
