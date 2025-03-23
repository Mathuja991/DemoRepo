"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase"; // Firebase config
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, orderBy } from "firebase/firestore"; // Firestore methods
import "../styles/admin.css";
import { useSearchParams } from "next/navigation";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCriteria, setFilterCriteria] = useState({ hall: "", date: "" });
  const [verifying, setVerifying] = useState(false);
  const searchParams = useSearchParams();
  const [selectedImage, setSelectedImage] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" or "desc" for sorting order

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        let q = collection(db, "bookings");

        // Filter by date if provided
        if (filterCriteria.date) {
          const selectedDate = new Date(filterCriteria.date);
          selectedDate.setHours(0, 0, 0, 0);

          const nextDay = new Date(selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          nextDay.setHours(0, 0, 0, 0);

          q = query(
            collection(db, "bookings"),
            where("date", ">=", Timestamp.fromDate(selectedDate)),
            where("date", "<", Timestamp.fromDate(nextDay)),
            orderBy("date", sortOrder) // Sort by date with the selected order
          );
        } else {
          q = query(
            collection(db, "bookings"),
            orderBy("date", sortOrder) // Default sort by date if no date filter is applied
          );
        }

        const querySnapshot = await getDocs(q);
        const bookingsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate().toISOString().split("T")[0], // Format date
        }));

        setBookings(bookingsList);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [filterCriteria, sortOrder]); // Add sortOrder to the dependency array to refetch when the sorting order changes

  // ✅ Function to update booking status (Approved/Rejected)
  const updateBookingStatus = async (bookingId, newStatus, userInfo, selectedHall, date, startTime, endTime) => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { status: newStatus });

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === bookingId ? { ...booking, status: newStatus } : booking
        )
      );

      if (newStatus === "Approved") {
        await sendBookingEmail(userInfo, selectedHall, date, startTime, endTime);
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
    }
  };

  // ✅ Payment verification function
  const handlePaymentVerification = async (bookingId, status) => {
    setVerifying(true);
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { paymentStatus: status });

      alert(`Payment has been ${status === "verified" ? "approved" : "rejected"}.`);
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert("Failed to verify payment.");
    } finally {
      setVerifying(false);
    }
  };

  // ✅ Send booking confirmation email
  const sendBookingEmail = async (userInfo, selectedHall, date, startTime, endTime) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInfo, selectedHall, date, startTime, endTime}),
      });
  
      const responseText = await response.text();
      console.log('Raw API Response:', responseText);
  
      const data = responseText ? JSON.parse(responseText) : { message: 'No response body' };
  
      if (!response.ok) {
        throw new Error(data.message || 'Unknown error occurred');
      }
  
      console.log('Email sent successfully:', data.message);
    } catch (error) {
      console.error('Error sending email:', error.message);
    }
  };

  // ✅ Toggle Sort Order function (ascending/descending)
  const toggleSortOrder = () => {
    setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
  };

  return (
    <>
      <div className="admin-dashboard-filter">
        <input
          type="text"
          placeholder="Search by name, email, or hall"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select name="hall" onChange={(e) => setFilterCriteria({ ...filterCriteria, hall: e.target.value })} value={filterCriteria.hall}>
          <option value="">Filter by Hall</option>
          <option value="Hall 1">Hall 1</option>
          <option value="Hall 2">Hall 2</option>
          <option value="Hall 3">Hall 3</option>
        </select>
        <input type="date" name="date" value={filterCriteria.date} onChange={(e) => setFilterCriteria({ ...filterCriteria, date: e.target.value })} />
        
        <button className="admin-dashboard-sortOrder"onClick={toggleSortOrder}>Sort by Date ({sortOrder === "asc" ? "Ascending" : "Descending"})</button>
      </div>

      <div className="admin-dashboard-body">
        <h1 className="admin-dashboard-header">Bookings</h1>
        <table className="admin-dashboard-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Hall</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Rent Amout</th>
              <th>Payment Slip</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.name}</td>
                <td>{booking.email}</td>
                <td>{booking.hall}</td>
                <td>{booking.date}</td>
                <td>{booking.startTime} - {booking.endTime}</td>
                <td>{booking.status || "Pending"}</td>
                <td>Rs.{booking.totalFee}</td>
                <td>
                  {booking.paymentSlip ? (
                    <>
                      {booking.paymentSlip.startsWith("data:application/pdf") ? (
                        <a
                          href={booking.paymentSlip}
                          download={`payment-slip-${booking.id}.pdf`}
                          style={{ textDecoration: "underline", color: "blue" }}
                        >
                          📄 Download Payment Slip (PDF)
                        </a>
                      ) : (
                        <a href="#" onClick={(e) => {
                          e.preventDefault();
                          setSelectedImage(booking.paymentSlip);
                        }}>
                          <img
                            src={booking.paymentSlip}
                            alt="Payment Slip"
                            style={{ width: "100px", height: "auto", cursor: "pointer" }}
                          />
                        </a>
                      )}
                      
                      {/* Modal for Full-Screen View */}
                      {selectedImage === booking.paymentSlip && (
                        <div
                          onClick={() => setSelectedImage(null)}
                          style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100vw",
                            height: "100vh",
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 1000,
                          }}
                        >
                          <img
                            src={selectedImage}
                            alt="Payment Slip"
                            style={{ maxWidth: "90%", maxHeight: "90%" }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <p>No payment slip uploaded</p>
                  )}
                </td>
                <td>
                  <button
                    className="admin-dashboard-button"
                    onClick={() => updateBookingStatus(booking.id, "Approved", booking, booking.hall, booking.date, booking.startTime, booking.endTime)}
                    disabled={booking.status === "Approved"}
                  >
                    Approve Booking
                  </button>
                  <button
                    className="admin-dashboard-button-reject"
                    onClick={() => updateBookingStatus(booking.id, "Rejected")}
                    disabled={booking.status === "Rejected"}
                  >
                    Reject Booking
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
