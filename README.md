# ChatterPoint - Server Side

This is the backend API for the ChatterPoint website. It powers the authentication, data management, and server-side logic of the application, built using **Node.js**, **Express.js**, and **MongoDB**.

## Features

- **Authentication**:
  - User login and registration with hashed passwords.
  - JSON Web Token (JWT) for secure authentication and session management.
- **Post Management**:
  - Create, update, delete, and retrieve posts.
  - Upvote and downvote functionality.
- **Comment Management**:
  - Add and retrieve comments on posts.
- **Admin Features**:
  - Manage user roles (user/admin).
  - Delete inappropriate posts or comments.
- **Responsive API Design**:
  - RESTful API endpoints for all interactions.

---

## Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) ODM.
- **Authentication**: JSON Web Tokens (JWT) and bcrypt for password hashing.
- **Environment Variables**: Managed via [dotenv](https://github.com/motdotla/dotenv).

