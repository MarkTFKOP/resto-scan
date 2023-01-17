import { Request, Response } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import models from "../models";
const authModel = models.auth;

class User {
  async Register(req: Request, res: Response) {
    try {
      let createObj = {};
      Object.assign(createObj, { name: req.body.name });
      Object.assign(createObj, { email: req.body.email });
      Object.assign(createObj, { username: req.body.username });
      const hash = await argon2.hash(req.body.password);
      //   let uuid = await argon2.hash("password");
      Object.assign(createObj, { password: hash });
      let registeredUser: any = await authModel.create(createObj);
      registeredUser = registeredUser.toObject();
      delete registeredUser.password;
      delete registeredUser.__v;
      var token = jwt.sign(registeredUser, process.env.JSON_WEB_TOKEN || "");
      let uuid = await argon2.hash(JSON.stringify(registeredUser));
      delete registeredUser.isDeleted;
      delete registeredUser.createdAt;
      delete registeredUser.isActive;
      delete registeredUser.updatedAt;
      res.send(registeredUser);
      await authModel.updateOne(
        { _id: registeredUser._id },
        { uuid: uuid.substring(uuid.length / 1.32), token: token }
      );
      return;
    } catch (error: any) {
      console.log(error);
      if (error.code && error.code == 11000)
        return res.status(500).send("Username already exists");
      return res.status(500).send("Something went wrong");
    }
  }
  async Login(req: Request, res: Response) {
    try {
      let createObj = {};
      Object.assign(createObj, { username: req.body.username });
      // Object.assign(createObj, { password: req.body.password });
      let loggedInUser: any = await authModel
        .findOne(createObj)
        .select("-__v -token -uuid");
      try {
        if (!loggedInUser._id) throw res.status(404).send("User not found");
      } catch (error) {
        return res.status(404).send("User not found");
      }
      let checklogged = await argon2.verify(
        loggedInUser.password,
        req.body.password
      );
      if (!checklogged) return res.status(401).send("Passwords don't match");
      loggedInUser = loggedInUser.toObject();
      var token = jwt.sign(loggedInUser, process.env.JSON_WEB_TOKEN || "");
      loggedInUser.token = token;
      delete loggedInUser.password;
      delete loggedInUser.isDeleted;
      delete loggedInUser.createdAt;
      delete loggedInUser.isActive;
      delete loggedInUser.updatedAt;
      res.send(loggedInUser);
      await authModel.updateOne({ _id: loggedInUser._id }, { token: token });
      return;
    } catch (error) {
      console.log(error);
      return res.status(500).send("Something went wrong");
    }
  }
  async GetUser(req: any, res: Response) {
    try {
      let user = await authModel
        .findOne({ _id: req.user._id })
        .select("name username token email -_id");
      // console.log("req.user", req.user);
      return res.send(user);
    } catch (error) {
      console.log(error);
    }
  }
  async UpdateUser(req: any, res: Response) {
    try {
      let update = {};
      if (req.body.name) Object.assign(update, { name: req.body.name });
      if (req.body.email) Object.assign(update, { email: req.body.email });
      await authModel.updateOne({ _id: req.user._id }, update);
      return res.status(200).send("updated");
    } catch (error) {
      console.log(error);
    }
  }
  async Logout(req: any, res: Response) {
    try {
      await authModel.updateOne({ _id: req.user._id }, { token: "" });
      return res.status(200).send("Logout successful");
    } catch (error) {
      console.log(error);
    }
  }
}

export default new User();
