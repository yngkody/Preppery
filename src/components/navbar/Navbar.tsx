import "./navbar.scss";

const Navbar: React.FC = () => (
  <div className="navbar">
    <div className="logo">
      <span>Preppery</span>
    </div>
    <div className="icons">
      <img src="/search.svg" alt="Search" className="icon" />
      <img src="/app.svg" alt="App" className="icon" />
      <img src="/expand.svg" alt="Expand" className="icon" />
      <div className="notification">
        <img src="/notifications.svg" alt="Notifications" className="icon" />
        <span>1</span>
      </div>
      <div className="user">
        <img
          src="https://images.pexels.com/photos/11038549/pexels-photo-11038549.jpeg"
          alt=""
        />
      </div>
      <img src="/settings.svg" alt="Settings" className="icon" />
    </div>
  </div>
);

export default Navbar;
