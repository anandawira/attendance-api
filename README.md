# Employee Attendance System with Geo Location

This is our second project in the Glint's Industry Project Exploration Program. We are building an attendance system for employee with geo location verification feature. Employee can fill their attendance time ONLY IF they are inside 100 meters radius from the office.

## Table of contents

- [Features](#features)
- [How to Install](#how-to-install)
- [Tech Stacks](#tech-stacks)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Authors](#authors)

## Features

##### Authentication

- Employee can register to the system using email and password.
- Employee need to wait for admin approval before using the account.
- The system will send an email to the employee after their account has been approved by the admin.
- Employee and admin can login to the system using email and password.
- Employee and admin can request the system to send reset password url by email.
- Employee and admin can reset the password using the link they received by email

##### Main App

- User must be within 100 meters radius from the office coordinate to fill the attendance.
- User can fill the attendance by sending current location to the system using the app.
- System can calculate total working hour of the day

##### Admin App

- Admin can approve and reject registered user.
- Admin can see list of attendance record by periods. Ex: daily, weekly, monthly.

## How to Install
Make sure you have nodejs and npm installed on your machine. And please make sure you already set [environment variables](#environment-variables) for this app.
And then run the code below in the terminal.
> npm install
> npm run start

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
  > Your Gmail full address. Please make sure you have enabled "less secure" on account setting. See [this page](https://nodemailer.com/usage/using-gmail/) for more information.
- GMAIL_PASSWORD
  > Your Gmail password.
- REDIS_URL
  > Your redis server url for caching.

## Deployment

This app will be deployed to a heroku server. Endpoint url and API documentation will be added to this document later.

## Authors

This project is property of Glint's Industry Project Exploration Group 1. Our team consist of:

- Achmad Hariyadi (Mentor)
- Ananda Wiradharma (Backend Developer)
- Mukhammad Miftakhul As'Adi (Frontend Developer)
- Vincent Nathaniel (Frontend Developer)
- Wildan Muhalid Rosyidi (Frontend Developer)
- Zidni Iman Sholihati (Backend Developer)
