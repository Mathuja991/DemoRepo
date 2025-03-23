"use client";
import { useState, useEffect } from "react";
import { auth } from "../../../lib/firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import "../../styles/changepass.css";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function ChangePassword({ onBack }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const docSnap = await getDoc(userRef);
          
          if (docSnap.exists()) {
            setRole(docSnap.data().role || "");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      }
    };
    
    fetchUserRole();
  }, []);

  const handleChangePassword = async () => {
    setLoading(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (user) {
        // Re-authenticate the user before updating password
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Update the password
        await updatePassword(user, newPassword);
        
        // Send confirmation email
        await sendPasswordChangeEmail(user.email);
        
        alert("Password changed successfully! A confirmation email has been sent.");
      }
    } catch (error) {
      console.error("Password change failed:", error);
      setError("Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordChangeEmail = async (userEmail) => {
    try {
      console.log("Sending confirmation email to:", userEmail);
      
      const response = await fetch("/api/send-email-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          subject: "Password Change Confirmation",
          message: "Your password has been successfully changed. If you did not request this change, please contact support immediately.",
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error sending email");
      }
      
      const result = await response.json();
      console.log("Email sent successfully:", result);
    } catch (error) {
      console.error("Error sending email:", error);
      // You can add a small notification but not block the password change
      alert("Password changed successfully, but there was an issue sending the confirmation email.");
    }
  };

  // Role-based redirect
  const handleBack = () => {
    if (role === "admin") {
      router.push("/admin/my-account");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="change-password-container">
      <h1>Change Password</h1>
      
      {error && <p className="error-message">{error}</p>}
      
      <label>Current Password</label>
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      
      <label>New Password</label>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      
      <button onClick={handleChangePassword} disabled={loading}>
        {loading ? "Changing..." : "Change Password"}
      </button>
      
      <button className="edit-back" onClick={handleBack}>
        Back
      </button>
    </div>
  );
}