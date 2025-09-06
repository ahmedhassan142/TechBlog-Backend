import bcrypt from "bcrypt";
// const express=require("express")

import { Request, Response } from "express";
import { User, validateLogin } from "../models/usermodel.js";

interface LoginRequestBody {
  email: string;
  password: string;
}

 // Update your login controller to:
// 1. Return token in both cookie and response body
// 2. Set proper CORS headers



const logincontroller = async (req: Request, res: Response) => {
  try {
    console.log("Login attempt:", req.body.email);
    
    const { error } = validateLogin(req.body);
    if (error) {
      console.log("Validation error:", error.details[0].message);
      return res.status(400).send({ message: error.details[0].message });
    }

    const user = await User.findOne({ email: req.body.email }).select('+password');
    if (!user) {
      console.log("User not found:", req.body.email);
      return res.status(401).send({ message: "Invalid Email or Password" });
    }

    console.log("User found:", user.email);
    console.log("Stored password hash:", user.password);
    console.log("Input password:", req.body.password);

    // Method 1: Use the model's comparePassword method
    const validPassword = await user.comparePassword(req.body.password);
    console.log("Password comparison result:", validPassword);

    if (!validPassword) {
      // Method 2: Try direct bcrypt comparison for debugging
      const directCompare = await bcrypt.compare(req.body.password, user.password);
      console.log("Direct bcrypt comparison:", directCompare);
      
      // Method 3: Check if password matches exactly (for testing)
      console.log("Exact match:", req.body.password === user.password);
      
      return res.status(401).send({ message: "Invalid Password" });
    }

    if (!user.verified) {
      return res.status(400).send({ message: "Please verify your email first" });
    }

    const token = user.generateAuthToken();
    
    res.cookie("authToken", token, {
      
      // sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.status(200).json({ 
      message: "Login successful", 
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarLink: user.avatarLink,
        role:user.role
      }
    });

  } catch (error) {
    console.error("Error in loginController:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
}

export default logincontroller;