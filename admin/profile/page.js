"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../../lib/firebase";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase"; // Firestore instance
import "../../styles/editprof.css";

export default function EditProfile({ onBack }) {
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      if (auth.currentUser) {
        setDisplayName(auth.currentUser.displayName || "");
        await fetchUserProfile(); // Load user data from Firestore
      } else {
        // If no user is logged in, redirect to login page
        router.push("/signin");
      }
    };
    
    checkUser();
  }, [router]);

  // Fetch user profile from Firestore
  const fetchUserProfile = async () => {
    if (auth.currentUser) {
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          setPhotoURL(docSnap.data().profileImage || "");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    }
  };

  // Function to resize and compress image - This function is missing in your code
  const resizeAndCompressImage = async (file, maxWidth, maxHeight, quality) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Get base64 representation
          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve(base64);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle Image Change & Save to Firestore
  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !auth.currentUser) return;
    
    setUploading(true);
    try {
      const base64Image = await resizeAndCompressImage(file, 200, 200, 0.7);
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userRef, { profileImage: base64Image }, { merge: true });
      setPhotoURL(base64Image);
      alert("Profile image updated!");
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  // Save Profile Changes
  const handleSave = async () => {
    if (!auth.currentUser) {
      alert("You must be logged in to update your profile.");
      return;
    }
    
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { displayName });
      
      // Update Firestore profile
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userRef, { 
        displayName: displayName 
      }, { merge: true });
      
      alert("Profile updated successfully!");
      // Redirect to dashboard after successful update
      router.push("/dashboard");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    }
  };

  return (
    <>
      <div className="edit-profile-container">
        <h1>Edit Profile</h1>
        
        <label>Name</label>
        <input 
          type="text" 
          value={displayName} 
          onChange={(e) => setDisplayName(e.target.value)} 
          placeholder="Enter your name"
        />
        
        <label>Profile Picture</label>
        <input 
          type="file" 
          accept="image/jpeg, image/png" 
          onChange={handleImageChange} 
        />
        {uploading && <p>Uploading...</p>}
        {photoURL && (
          <div className="profile-preview">
            <img src={photoURL} alt="Profile" className="profile-photo" />
          </div>
        )}
        
        <button className="edit-save" onClick={handleSave}>Save</button>
      </div>
      <button className="edit-back" onClick={() => router.push("/admin/my-account")}>Back to Dashboard</button>
    </>
  );
}