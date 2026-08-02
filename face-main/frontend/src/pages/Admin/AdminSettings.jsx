import React, { useState } from 'react';
import { Settings, Bell, Lock, Palette, Globe, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/Admin/layout/AdminLayout';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    twoFactorAuth: false,
    darkMode: true,
    language: 'en'
  });
  const [saving, setSaving] = useState(false);

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
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-secondary-400 mt-1">Manage your application preferences</p>
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
                  <p className="text-sm text-secondary-400">Receive email updates about activity</p>
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
              <Lock className="w-6 h-6 text-neon-purple" />
              <h2 className="text-lg font-semibold text-white">Security</h2>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-white font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-secondary-400">Add an extra layer of security</p>
              </div>
              <ToggleSwitch 
                enabled={settings.twoFactorAuth} 
                onToggle={() => handleToggle('twoFactorAuth')} 
              />
            </div>
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

            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Select Language
              </label>
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
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 px-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {saving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;