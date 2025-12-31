import User from "../models/userLogin.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';

// export const Login = async (req, res) => {
//   try {
//     // Extract username and password from the request body
//     const { username, password } = req.body;

//     // Search for a user with the provided username in the User model
//     const user = await User.findOne({ username });

//     if (!user) {
//       // User not found
//       return res.status(401).json({ authenticated: false, message: 'Invalid credentials' });
//     }

//     // Compare the provided plaintext password with the stored hashed password
//     const isPasswordValid = await bcrypt.compare(password, user.password);

//     if (isPasswordValid) {
//       // Password is valid, login successful
//       return res.status(200).json({ authenticated: true, message: 'Login successful', user: user.username, id: user._id });
//     } else {
//       // Password is invalid
//       return res.status(401).json({ authenticated: false, message: 'Invalid credentials' });
//     }
//   } catch (error) {
//     console.error('Error during login:', error);
//     return res.status(500).json({ authenticated: false, error: 'An error occurred during login' });
//   }
// };


// export const Login = async (req, res) => {
//   try {
//     // Extract username and password from the request body
//     const { username, password } = req.body;

//     // Search for a user with the provided username in the User model
//     const user = await User.findOne({ username });

//     if (!user) {
//       // User not found
//       return res.status(401).json({ authenticated: false, message: 'Invalid credentials' });
//     }

//     // Compare the provided plaintext password with the stored hashed password
//     const isPasswordValid = await bcrypt.compare(password, user.password);

//     if (isPasswordValid) {
//       // Password is valid, generate a token
//       const token = jwt.sign(
//         // Payload: Include data you want to associate with the token (e.g., user ID)
//         { userId: user._id },
//         // Secret key: Keep this secret and don't expose it publicly
//         'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTY5NDg4MzMwMywiaWF0IjoxNjk0ODgzMzAzfQ.Q3cGdt97CLUpZf4YZ_5Zsg_eEq5tmXLqYyhjd3RYIWU',
//         // Options: Set token expiration and any other relevant options
//         { expiresIn: '1h' }
//       );

//       // Send the token along with other data in the response
//       return res.status(200).json({ authenticated: true, message: 'Login successful', user: user.username, userId: user._id,token });
//     } else {
//       // Password is invalid
//       return res.status(401).json({ authenticated: false, message: 'Invalid credentials' });
//     }
//   } catch (error) {
//     console.error('Error during login:', error);
//     return res.status(500).json({ authenticated: false, error: 'An error occurred during login' });
//   }
// };

export const Login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Search for a user with the provided username in the User model
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ authenticated: false, message: 'Invalid credentials' });
    }

    // Compare the provided plaintext password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET, // Use an environment variable for your secret key
        { expiresIn: '1h' }
      );

      return res.status(200).json({
        authenticated: true,
        message: 'Login successful',
        user: user.username,
        userId: user._id,
        token,
      });
    } else {
      return res.status(401).json({ authenticated: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ authenticated: false, error: 'An error occurred during login' });
  }
};

export const CreateUser = async(req, res) => {

  try {
    const { username, password } = req.body;

    // Check if the username already exists (you may have additional checks)
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash the password
    const saltRounds = 10; // Adjust the number of salt rounds as needed
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new user with the hashed password
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }

}

export const getUser = async(req, res) => {

  try {
    const users = await User.find({}, 'username'); // Retrieve only the username field
    
    // You can choose which user data to send to the client
    const userData = users.map((user) => ({
      _id: user._id,
      username: user.username,
      // Add more fields as needed
    }));

    res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }

}


export const getUsers = async(req, res) => {

  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // You can choose which user data to send to the client
    const userData = {
      _id: user._id,
      username: user.username,
      // Add more fields as needed
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }

}

export const updateUser = async(req, res) => {

  try {
    const userId = req.params.id;
    const { username, password } = req.body; // Assuming you send username and password in the request body

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user data
    user.username = username;

    // Hash the new password before updating it
    if (password) {
      const saltRounds = 10; // You can adjust the number of salt rounds as needed
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      user.password = hashedPassword;
    }

    // Save the updated user
    await user.save();

    // You can choose which user data to send in the response
    const updatedUserData = {
      _id: user._id,
      username: user.username,
      // Add more fields as needed
    };

    res.status(200).json(updatedUserData);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


export const deleteUser = async(req, res) =>{

  const pId  = req.params.id;

  try {
      const deletedUser = await User.findByIdAndDelete(pId);

      if (!deletedUser) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
  } catch (error) {
      console.error('Error deleting User:', error);
      res.status(500).json({ error: 'An error occurred while deleting the User' });
  }
}


export const storeAccess = async(req, res) =>{

  try {
    
    const { permissions, user } = req.body; // Assuming you send permissions in the request body

    // Find the user by ID
    const users = await User.findById(user);

    if (!users) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's permissions
    users.userAccess = permissions;

    // Save the updated user
    await users.save();

    res.status(200).json({ message: 'Permissions saved successfully' });
  } catch (error) {
    console.error('Error saving permissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }

}

export const getAccess = async(req, res) => {

  try {
    const userId = req.params.id; // Assuming you have a route parameter for the user ID

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // You can choose which user data to send to the client
    const userData = {
      _id: user._id,
      username: user.username,
      // Add more fields as needed
    };

    // Get user permissions
    const permissions = user.userAccess || []; // Get user permissions, default to an empty array

    // Include both user data and permissions in the response
    const responseData = {
      user: userData,
      permissions,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }

}


export default Login;
