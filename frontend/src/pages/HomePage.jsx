import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="homepage-container">

      <section className="hero-section">
        <div className="hero-content">
          <h1>AarohYatrika</h1>
          <h2>Her Drive, Her Direction.</h2>
          <p>
            Welcome to India's first women-led mobility platform, designed for
            your safety, comfort, and empowerment. More than just a ride,
            AarohYatrika is a movement.
          </p>
          <Link to="/register" className="btn btn-primary">
            Join the Movement
          </Link>
        </div>
        <div className="hero-image">
          <img src="/images/hero.jpg" alt="Hero" />
        </div>
      </section>

      <section className="features-section">
        <div className="feature-item">
          <div className="feature-image">
            <img src="/images/hero.jpg" alt="Feature" />
                      </div>
          <h3>“Because Every Woman Deserves the Driver’s Seat.”</h3>
          <p>
            We are building a safe, inclusive space where women can support
            themselves and uplift others through trusted, women-led
            transportation services.
          </p>
        </div>
        <div className="feature-item">
          <div className="feature-image">
                        <img src="/images/feature.jpg" alt="Feature" />

                       </div>
          <h3>“Her Journey is Her Ascent”</h3>
          <p>
            Our vision is to inspire a new generation of independent women,
            whether they're commuting, working, or chasing their dreams. We
            provide the vehicle for freedom and strength.
          </p>
        </div>
      </section>

      
      <section className="how-it-works-section">
        <h2>How It All Started</h2>
        <p className="subtitle">
          The idea for AarohYatrika was born from a simple yet powerful
          truth: the need for safer, more inclusive transportation for women.
          We saw the road not just as a way to get from A to B, but as a path
          forward.
        </p>
        <div className="steps-container">
          <div className="step-card">
            <span>1</span>
            <h4>Request a Ride</h4>
            <p>Select your location and destination. Choose "Ride Now" or schedule for later.</p>
          </div>
          <div className="step-card">
            <span>2</span>
            <h4>Verify Your Ride</h4>
            <p>Once matched, use your unique OTP to verify your driver and start the trip safely.</p>
          </div>
          <div className="step-card">
            <span>3</span>
            <h4>Travel & Arrive</h4>
            <p>Enjoy a safe, comfortable ride with a verified woman driver. Pay and rate your trip.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;