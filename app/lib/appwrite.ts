import {
  Client,
  Account,
  Avatars,
  OAuthProvider,
  Databases,
  Query,
} from 'react-native-appwrite';
import * as Linking from 'expo-linking';
import { openAuthSessionAsync } from 'expo-web-browser';

// Set the platform, endpoint, and project ID
export const config = {
  platform: process.env.EXPO_PUBLIC_APPWRITE_PLATFORM,
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  galleriesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  propertiesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
};

export const client = new Client();

client
  .setPlatform(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.platform!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);

// Add a function to handle login
export async function loginWithGoogle() {
  try {
    // Create a redirect URI
    const redirecturi = Linking.createURL('/');

    // Create an OAuth2 token
    const response = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirecturi,
    );

    // Throw an error if the response is empty
    if (!response) throw new Error('Failed to login');

    // Open the browser to authenticate the user
    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirecturi,
    );

    // Throw an error if the browser result is empty
    if (browserResult.type !== 'success') throw new Error('Failed to login');

    // Parse the URL
    const url = new URL(browserResult.url);

    // Get the secret and user ID
    const secret = url.searchParams.get('secret')?.toString();
    const userId = url.searchParams.get('userId')?.toString();

    // Throw an error if the secret or user ID is empty
    if (!secret || !userId) throw new Error('Failed to login');

    // Create a session
    const session = await account.createSession(userId, secret);

    // Throw an error if the session is empty
    if (!session) throw new Error('Failed to create a session');

    // Return true if the session is created
    return true;
  } catch (error) {
    // Log the error
    console.error(error);

    // Return false if the session is not created
    return false;
  }
}

// Add a function to handle logout
export async function logout() {
  try {
    // Delete the current session
    await account.deleteSession('current');

    // Return true if the session is
    return true;
  } catch (error) {
    // Log the error
    console.error(error);

    // Return false if the session is not deleted
    return false;
  }
}

// Add a function to get user details
export async function getUser() {
  try {
    // Get the user details
    const user = await account.get();

    // Return the user details
    if (user.$id) {
      // Get the user avatar
      const userAvatar = await avatar.getInitials(user.name);

      // Return the user details with the avatar
      return { ...user, avatar: userAvatar.toString() };
    }
  } catch (error) {
    // Log the error
    console.error(error);

    // Return null if the user details are not found
    return null;
  }
}

export async function getLatestProperties() {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.orderAsc('$createdAt'), Query.limit(5)],
    );

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getProperties({
  filter,
  query,
  limit,
}: {
  filter: string;
  query: string;
  limit?: number;
}) {
  try {
    const buildQuery = [Query.orderDesc('$createdAt')];

    if (filter && filter !== 'All') {
      buildQuery.push(Query.equal('type', filter));
    }

    if (query) {
      buildQuery.push(
        Query.or([
          Query.search('name', query),
          Query.search('address', query),
          Query.search('type', query),
        ]),
      );
    }

    if (limit) {
      buildQuery.push(Query.limit(limit));
    }

    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      buildQuery,
    );

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}
