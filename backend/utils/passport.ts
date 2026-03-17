import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback as GoogleVerifyCallback } from 'passport-google-oauth20';
import { Strategy as GithubStrategy, Profile as GithubProfile } from 'passport-github2';
import { UserModel } from '../models/User';

const buildOAuthUser = async (email: string, displayName: string | undefined) => {
  const existing = await UserModel.findOne({ email });
  if (existing) {
    return existing;
  }

  return UserModel.create({
    email,
    role: 'User',
  });
};

const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/oauth/google/callback';

if (googleClientID && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientID,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackURL,
      },
      async (_accessToken: string, _refreshToken: string, profile: GoogleProfile, done: GoogleVerifyCallback) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('Google account does not expose email'));
          }

          const user = await buildOAuthUser(email.toLowerCase(), profile.displayName);
          return done(null, user as unknown as Express.User);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

const githubClientID = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const githubCallbackURL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/auth/oauth/github/callback';

if (githubClientID && githubClientSecret) {
  passport.use(
    new GithubStrategy(
      {
        clientID: githubClientID,
        clientSecret: githubClientSecret,
        callbackURL: githubCallbackURL,
        scope: ['user:email'],
      },
      async (_accessToken: string, _refreshToken: string, profile: GithubProfile, done: (error: Error | null, user?: unknown) => void) => {
        try {
          const profileEmail = profile.emails?.[0]?.value;
          if (!profileEmail) {
            return done(new Error('GitHub account does not expose email'));
          }

          const user = await buildOAuthUser(profileEmail.toLowerCase(), profile.displayName);
          return done(null, user as unknown as Express.User);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

export default passport;