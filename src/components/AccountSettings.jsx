import { useState } from 'react';
import './AccountSettings.css';

/**
 * Account Settings Screen
 * User profile management, display preferences, notification settings
 * Dark fantasy theme with organized settings tabs
 */

export default function AccountSettings({
  user = {},
  onClose = () => {},
  onSave = () => {}
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    displayName: user.name || '',
    email: user.email || '',
    preferredTheme: 'dark',
    notifications: {
      turnNotifications: true,
      combatAlerts: true,
      messageNotifications: true,
      soundEnabled: true
    },
    accessibility: {
      largeText: false,
      colorblindMode: false,
      animationsEnabled: true
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleToggle = (category, field) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: !prev[category][field]
      }
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="account-settings-container">
      {/* Header */}
      <div className="settings-header">
        <h1 className="settings-title">Account Settings</h1>
        <button className="settings-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button
          className={`tab-button ${activeTab === 'accessibility' ? 'active' : ''}`}
          onClick={() => setActiveTab('accessibility')}
        >
          Accessibility
        </button>
      </div>

      {/* Tab Content */}
      <div className="settings-content">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="settings-tab-pane active">
            <div className="settings-section">
              <h2 className="section-title">Profile Information</h2>

              <div className="settings-field">
                <label htmlFor="displayName" className="field-label">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="field-input"
                  placeholder="Your display name"
                />
                <p className="field-hint">How other players see your name</p>
              </div>

              <div className="settings-field">
                <label htmlFor="email" className="field-label">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="field-input disabled"
                />
                <p className="field-hint">Email address cannot be changed here</p>
              </div>
            </div>

            <div className="settings-section">
              <h2 className="section-title">Account Actions</h2>
              <button className="action-button secondary">Change Password</button>
              <button className="action-button secondary">Download Data</button>
              <button className="action-button danger">Delete Account</button>
              <p className="field-hint">Deleting your account will remove all campaigns and data</p>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="settings-tab-pane active">
            <div className="settings-section">
              <h2 className="section-title">Display</h2>

              <div className="settings-field">
                <label htmlFor="theme" className="field-label">Theme</label>
                <select
                  id="theme"
                  name="preferredTheme"
                  value={formData.preferredTheme}
                  onChange={handleInputChange}
                  className="field-select"
                >
                  <option value="dark">Dark Fantasy</option>
                  <option value="light">Light (Not Recommended)</option>
                  <option value="auto">System Default</option>
                </select>
              </div>
            </div>

            <div className="settings-section">
              <h2 className="section-title">Notifications</h2>

              <div className="toggle-field">
                <div className="toggle-label">
                  <span className="toggle-title">Turn Notifications</span>
                  <span className="toggle-desc">Alert when it's your turn in combat</span>
                </div>
                <button
                  className={`toggle-switch ${formData.notifications.turnNotifications ? 'on' : 'off'}`}
                  onClick={() => handleToggle('notifications', 'turnNotifications')}
                  aria-label="Toggle turn notifications"
                />
              </div>

              <div className="toggle-field">
                <div className="toggle-label">
                  <span className="toggle-title">Combat Alerts</span>
                  <span className="toggle-desc">Notify when combat starts or ends</span>
                </div>
                <button
                  className={`toggle-switch ${formData.notifications.combatAlerts ? 'on' : 'off'}`}
                  onClick={() => handleToggle('notifications', 'combatAlerts')}
                  aria-label="Toggle combat alerts"
                />
              </div>

              <div className="toggle-field">
                <div className="toggle-label">
                  <span className="toggle-title">Message Notifications</span>
                  <span className="toggle-desc">Alert for new messages from The Narrator</span>
                </div>
                <button
                  className={`toggle-switch ${formData.notifications.messageNotifications ? 'on' : 'off'}`}
                  onClick={() => handleToggle('notifications', 'messageNotifications')}
                  aria-label="Toggle message notifications"
                />
              </div>

              <div className="toggle-field">
                <div className="toggle-label">
                  <span className="toggle-title">Sound Effects</span>
                  <span className="toggle-desc">Enable audio for notifications and gameplay</span>
                </div>
                <button
                  className={`toggle-switch ${formData.notifications.soundEnabled ? 'on' : 'off'}`}
                  onClick={() => handleToggle('notifications', 'soundEnabled')}
                  aria-label="Toggle sound"
                />
              </div>
            </div>
          </div>
        )}

        {/* Accessibility Tab */}
        {activeTab === 'accessibility' && (
          <div className="settings-tab-pane active">
            <div className="settings-section">
              <h2 className="section-title">Accessibility Options</h2>

              <div className="toggle-field">
                <div className="toggle-label">
                  <span className="toggle-title">Large Text</span>
                  <span className="toggle-desc">Increase font sizes across the application</span>
                </div>
                <button
                  className={`toggle-switch ${formData.accessibility.largeText ? 'on' : 'off'}`}
                  onClick={() => handleToggle('accessibility', 'largeText')}
                  aria-label="Toggle large text"
                />
              </div>

              <div className="toggle-field">
                <div className="toggle-label">
                  <span className="toggle-title">Colorblind Mode</span>
                  <span className="toggle-desc">Adjust colors for colorblind accessibility</span>
                </div>
                <button
                  className={`toggle-switch ${formData.accessibility.colorblindMode ? 'on' : 'off'}`}
                  onClick={() => handleToggle('accessibility', 'colorblindMode')}
                  aria-label="Toggle colorblind mode"
                />
              </div>

              <div className="toggle-field">
                <div className="toggle-label">
                  <span className="toggle-title">Animations</span>
                  <span className="toggle-desc">Enable visual animations and transitions</span>
                </div>
                <button
                  className={`toggle-switch ${formData.accessibility.animationsEnabled ? 'on' : 'off'}`}
                  onClick={() => handleToggle('accessibility', 'animationsEnabled')}
                  aria-label="Toggle animations"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="settings-footer">
        <button className="button secondary" onClick={onClose}>Cancel</button>
        <button className="button primary" onClick={handleSave}>Save Changes</button>
      </div>
    </div>
  );
}
