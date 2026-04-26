"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
  type Auth,
  type AuthProvider
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp() {
  if (!firebaseConfigured) {
    return null;
  }

  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
  }

  return app;
}

export function getAuthClient() {
  if (!firebaseConfigured) {
    return null;
  }

  if (!auth) {
    const firebaseApp = getFirebaseApp();
    auth = firebaseApp ? getAuth(firebaseApp) : null;
  }

  return auth;
}

export function createGoogleProvider(): AuthProvider {
  return new GoogleAuthProvider();
}

export function createAppleProvider(): AuthProvider {
  return new OAuthProvider("apple.com");
}
