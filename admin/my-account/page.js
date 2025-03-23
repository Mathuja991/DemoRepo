"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase"; // Import Firestore
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from "firebase/firestore";
import "../../styles/admindashboard.css";


export default function Dashboard() {
  const [user, setUser] = useState(null);
 
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
       
        await fetchUserProfile(user.uid); // Fetch user profile details
      } else {
        router.push("/signin"); // Redirect if not logged in
      }
    });

    return () => unsubscribe();
  }, []); // Only run once on component mount

    const fetchUserProfile = async (userId) => {
      try {
        const userRef = doc(db, "users", userId);
        const docSnap = await getDoc(userRef);
  
        if (docSnap.exists()) {
          console.log("User profile fetched:", docSnap.data()); // Log user profile data
          setUser((prevState) => ({
            ...prevState,
            ...docSnap.data(),
          })); // Merge the fetched user profile data with existing state
        } else {
          console.log("No user profile document found.");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
  

  return (
    <div className="dashboard-container">
      <h1>Welcome, {user?.displayName || "Guest"} 👋</h1>

      {/* User Profile Section */}
      <div className="dasboard-profile-section">
  {user ? (
    <>
      <img 
        src={user.profileImage || '/path/to/default-avatar.png'} // Fallback to a default image
        alt="Profile" 
        className="profile-photo" 
      />
      <h2>{user.displayName}</h2>
    </>
  ) : (
    <p>Loading profile...</p>
  )}
  <p>Email: {user?.email}</p>
   {/* Links for Edit Profile and Change Password */}
   <div className="dasboard-profile-links">
          <button onClick={() => router.push("/admin/profile")}>Edit Profile</button>
          <button onClick={() => router.push("/admin/editpassword")}>Change Password</button>
        </div>
</div>
</div>

  );
}
