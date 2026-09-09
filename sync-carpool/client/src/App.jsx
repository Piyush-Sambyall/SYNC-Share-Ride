import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import FindRide from "./pages/FindRide";
import ActiveRide from "./pages/ActiveRide";
import DriverDashboard from "./pages/DriverDashboard";
import DriverRide from "./pages/DriverRide";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import RecurringRides from "./pages/RecurringRides";
import Safety from "./pages/Safety";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/find-a-ride" element={<FindRide />} />
        <Route path="/ride/:id" element={<ActiveRide />} />
        <Route path="/drive" element={<DriverDashboard />} />
        <Route path="/drive/:id" element={<DriverRide />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/recurring-rides" element={<RecurringRides />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
      <Footer />
    </>
  );
}
