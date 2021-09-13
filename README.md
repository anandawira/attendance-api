# Employee Attendance System with Geo Location

This is our second project in the Glint's Industry Project Exploration Program. We are building an attendance system for employee with geo location verification feature. Employee can mark their attendance time ONLY IF they are inside 100 meters radius from the office.

## Table of contents

- [Features](#features)
- [Tech Stacks](#tech-stacks)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Authors](#authors)

## Features

- Employee registration with email and password. Admin manually accept or decline registered employee.
- Employee can mark their attendance in and attendance out time using this application from anywhere as long as it's still inside 100 meters radius from the office.

## Tech Stacks

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)

## Environment Variables

Please set up all environment variables below before starting the server.

- MONGO_DB
  > Your mongodb connection url.
- REFRESH_TOKEN_SECRET
  > Secret string for signing and verifying refresh token.
- ACCESS_TOKEN_SECRET
  > Secret string for signing and verifying access token.
- FORGET_PASSWORD_SECRET
  > Secret string for signing and verifying forget password token.
- GMAIL_USERNAME
  > Your Gmail full address. Ex: **email\@example.com** . Please make sure you have enabled "less secure" on account setting. See [this page](https://nodemailer.com/usage/using-gmail/) for more information.
- GMAIL_PASSWORD
  > Your Gmail password.

## Deployment

This app will be deployed to a heroku server. Endpoint url and API documentation will be added to this document later.

## Authors

This project is property of Glint's Industry Project Exploration Group 1. Our team consist of:

- Achmad Hariyadi (Mentor)
- Ananda Wiradharma (Backend Developer)
- Zidni Iman Sholihati (Backend Developer)
- Vincent Nathaniel (Frontend Developer)
- Wildan Muhalid Rosyidi (Frontend Developer)
- Mukhammad Miftakhul As'Adi (Frontend Developer)
