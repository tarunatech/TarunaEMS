import React, { useState } from 'react';
import { Bell, Lock, Palette, Globe, Save, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { authAPI } from '../../utils/api';

const EmployeeSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    darkMode: true,
    language: 'en'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('userSettings', JSON.stringify(settings));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const ToggleSwitch = ({ enabled, onToggle }) => (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-gradient-to-r from-neon-pink to-neon-purple' : 'bg-secondary-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <EmployeeLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-secondary-400 mt-1">Manage your preferences</p>
        </div>

        <div className="space-y-6">
          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="w-6 h-6 text-neon-pink" />
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-secondary-700">
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-sm text-secondary-400">Receive email updates about your tasks and leaves</p>
                </div>
                <ToggleSwitch 
                  enabled={settings.emailNotifications} 
                  onToggle={() => handleToggle('emailNotifications')} 
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-sm text-secondary-400">Receive push notifications on your device</p>
                </div>
                <ToggleSwitch 
                  enabled={settings.pushNotifications} 
                  onToggle={() => handleToggle('pushNotifications')} 
                />
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Key className="w-6 h-6 text-neon-purple" />
              <h2 className="text-lg font-semibold text-white">Change Password</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full py-3 px-4 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full py-3 px-4 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full py-3 px-4 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                className="w-full py-3 px-4 bg-secondary-700 hover:bg-secondary-600 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {changingPassword ? (
                  <span>Changing...</span>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Palette className="w-6 h-6 text-neon-pink" />
              <h2 className="text-lg font-semibold text-white">Appearance</h2>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-white font-medium">Dark Mode</p>
                <p className="text-sm text-secondary-400">Use dark theme throughout the app</p>
              </div>
              <ToggleSwitch 
                enabled={settings.darkMode} 
                onToggle={() => handleToggle('darkMode')} 
              />
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Globe className="w-6 h-6 text-neon-purple" />
              <h2 className="text-lg font-semibold text-white">Language</h2>
            </div>

            <select
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full py-3 px-4 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="hi">Hindi</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 px-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeSettings;