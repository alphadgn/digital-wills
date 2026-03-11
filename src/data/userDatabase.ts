
import { UserProfile } from "@/types/user";

// Mock database of users - in a real app, this would be stored in a backend database
let users: UserProfile[] = [
  {
    id: "1",
    walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    beneficiaryWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    createdAt: "2025-04-01T10:00:00Z",
    willCreated: true,
    communicationPreference: {
      method: "email",
      value: "user1@example.com"
    },
    donorSSN: null,
    claimProcessed: false
  },
  {
    id: "2",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    beneficiaryWallet: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    createdAt: "2025-04-02T10:00:00Z",
    willCreated: true,
    communicationPreference: {
      method: "phone",
      value: "+12125551234"
    },
    donorSSN: null,
    claimProcessed: false
  }
];

export const findUserByWallet = (walletAddress: string): UserProfile | undefined => {
  return users.find(user => user.walletAddress.toLowerCase() === walletAddress.toLowerCase());
};

export const addUser = (user: Omit<UserProfile, "id" | "createdAt">): UserProfile => {
  const newUser: UserProfile = {
    ...user,
    id: (users.length + 1).toString(),
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  return newUser;
};

export const updateUser = (walletAddress: string, updates: Partial<UserProfile>): UserProfile | undefined => {
  const userIndex = users.findIndex(user => user.walletAddress.toLowerCase() === walletAddress.toLowerCase());
  
  if (userIndex === -1) {
    return undefined;
  }
  
  users[userIndex] = { ...users[userIndex], ...updates };
  return users[userIndex];
};

export const deleteUser = (walletAddress: string): boolean => {
  const initialLength = users.length;
  users = users.filter(user => user.walletAddress.toLowerCase() !== walletAddress.toLowerCase());
  return users.length < initialLength;
};

export const getAllUsers = (): UserProfile[] => {
  return [...users];
};

export const getAllProcessedClaims = (): UserProfile[] => {
  return users.filter(user => user.claimProcessed === true);
};
