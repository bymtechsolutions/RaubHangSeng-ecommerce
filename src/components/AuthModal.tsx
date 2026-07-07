import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, Lock, Mail, Phone, MapPin, Award, LogOut, Save, Eye, EyeOff, CheckCircle, Clock, ShoppingBag } from 'lucide-react';
import { Language, User } from '../types';
import { loginMember, registerMember, updateMemberProfile } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  orderHistory?: any[]; // optional, to show user orders in their profile
  mode?: 'modal' | 'page';
}

export default function AuthModal({
  isOpen,
  onClose,
  language,
  currentUser,
  setCurrentUser,
  orderHistory = [],
  mode = 'modal',
}: AuthModalProps) {
  const isZh = language === 'zh';
  const isModal = mode === 'modal';

  // Modal active tab: 'login' | 'signup' | 'profile'
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Pahang');
  const [postcode, setPostcode] = useState('');

  // Notification / Success / Error states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Refresh form states when current user loads or changes
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPhoneNumber(currentUser.phoneNumber || '');
      setEmail(currentUser.email || '');
      setAddress(currentUser.address || '');
      setCity(currentUser.city || '');
      setStateName(currentUser.state || 'Pahang');
      setPostcode(currentUser.postcode || '');
    } else {
      resetForm();
    }
  }, [currentUser]);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEmail('');
    setFullName('');
    setPhoneNumber('');
    setAddress('');
    setCity('');
    setStateName('Pahang');
    setPostcode('');
    setError(null);
    setSuccess(null);
  };

  if (isModal && !isOpen) return null;

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError(isZh ? '请填写所有必填字段' : 'Please fill in all required fields');
      return;
    }

    let userObj: User;
    try {
      const response = await loginMember(username.toLowerCase().trim(), password);
      userObj = response.profile;
    } catch {
      setError(isZh ? '用户名或密码不正确' : 'Invalid username or password');
      return;
    }

    // Success login
    setCurrentUser(userObj);
    localStorage.setItem('raub_hang_seng_current_user', JSON.stringify(userObj));
    
    setSuccess(isZh ? '登录成功！欢迎回来！' : 'Login successful! Welcome back!');
    setTimeout(() => {
      setSuccess(null);
      if (isModal) {
        onClose();
      }
    }, 1500);
  };

  // Handle Signup submission
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password || !fullName || !phoneNumber) {
      setError(isZh ? '用户名、密码、收件姓名和电话号码为必填项' : 'Username, password, full name, and phone number are required');
      return;
    }

    if (username.length < 3) {
      setError(isZh ? '用户名长度至少为 3 个字符' : 'Username must be at least 3 characters long');
      return;
    }

    const key = username.toLowerCase().trim();
    // Save member details
    const newProfile: User = {
      username: username.trim(),
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      city: city.trim(),
      state: stateName,
      postcode: postcode.trim(),
      email: email.trim(),
      memberPoints: 0,
    };

    try {
      const response = await registerMember(key, password, newProfile);
      setCurrentUser(response.profile);
      localStorage.setItem('raub_hang_seng_current_user', JSON.stringify(response.profile));
    } catch {
      setError(isZh ? '该用户名已被注册' : 'This username is already taken');
      return;
    }

    setSuccess(isZh ? '注册成功！' : 'Registration successful!');
    setTimeout(() => {
      setSuccess(null);
      if (isModal) {
        onClose();
      }
    }, 2000);
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setError(null);
    setSuccess(null);

    const updatedProfile: User = {
      ...currentUser,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      city: city.trim(),
      state: stateName,
      postcode: postcode.trim(),
      email: email.trim(),
    };

    try {
      const response = await updateMemberProfile(currentUser.username, updatedProfile);
      setCurrentUser(response.profile);
      localStorage.setItem('raub_hang_seng_current_user', JSON.stringify(response.profile));
    } catch {
      setError(isZh ? 'ä¼šå‘˜èµ„æ–™æ›´æ–°å¤±è´¥ï¼Œè¯·é‡è¯•' : 'Unable to update profile. Please retry.');
      return;
    }

    setSuccess(isZh ? '会员资料更新成功！' : 'Member profile updated successfully!');
    setIsEditing(false);
    setTimeout(() => setSuccess(null), 2500);
  };

  // Logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('raub_hang_seng_current_user');
    setSuccess(isZh ? '已安全退出登录' : 'Logged out successfully');
    resetForm();
    setTimeout(() => {
      setSuccess(null);
      if (isModal) {
        onClose();
      }
    }, 1200);
  };

  // Filter orders matching logged in username or phone number
  const userOrders = currentUser
    ? orderHistory.filter(
        (o) =>
          o.details?.phoneNumber?.replace(/\s/g, '') === currentUser.phoneNumber?.replace(/\s/g, '') ||
          o.userId === currentUser.username
      )
    : [];

  const panel = (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        id={isModal ? 'auth-modal-content' : 'auth-page-content'}
        className={`relative w-full max-w-lg rhs-panel border rounded-2xl overflow-hidden flex flex-col ${
          isModal ? 'shadow-2xl z-10 my-8 max-h-[90vh]' : 'shadow-xl'
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#c4d5d9] rhs-panel-soft flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="bg-sky-500 text-white p-1.5 rounded-lg shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {currentUser
                  ? isZh
                    ? '恒升河鱼会员中心'
                    : 'Raub Hang Seng Member Club'
                  : isZh
                    ? '会员登录与注册'
                    : 'Member Club Account'}
              </h3>
              <p className="text-[10px] text-slate-500">
                {currentUser
                  ? isZh
                    ? `欢迎回来，${currentUser.fullName}`
                    : `Welcome back, ${currentUser.fullName}`
                  : isZh
                    ? '登录解锁快速下单、地址保存与专属会员积分'
                    : 'Access fast checkout, address auto-fill & loyalty rewards'}
              </p>
            </div>
          </div>
          {isModal && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Success & Error Floating Notification bar */}
        {success && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 text-emerald-700 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border-b border-rose-100 px-5 py-3 text-rose-700 text-xs font-semibold flex items-center space-x-2">
            <X className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="p-6 overflow-y-auto flex-grow space-y-5 rhs-panel">
          {currentUser ? (
            /* ============================================================== */
            /* PROFILE / DASHBOARD VIEW                                       */
            /* ============================================================== */
            <div className="space-y-6">
              {/* Member Card */}
              <div className="relative bg-gradient-to-tr from-sky-600 via-sky-700 to-blue-800 rounded-2xl p-5 text-white shadow-lg overflow-hidden border border-sky-400/20">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
                  <Award className="w-48 h-48" />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest bg-sky-500/40 text-sky-100 px-2 py-0.5 rounded-full font-bold">
                      {isZh ? '黄金尊贵会员' : 'Gold Premium Member'}
                    </span>
                    <h4 className="text-lg font-bold mt-2 font-sans tracking-wide">
                      {currentUser.fullName}
                    </h4>
                    <p className="text-xs text-sky-200/90 font-mono mt-0.5">
                      {currentUser.email || (isZh ? '未绑定邮箱' : 'No Email linked')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-sky-200 block uppercase tracking-wider">
                      {isZh ? '尊享积分' : 'Loyalty Points'}
                    </span>
                    <strong className="text-2xl font-black font-mono text-amber-300 block drop-shadow-sm">
                      {currentUser.memberPoints} <span className="text-xs font-medium">{isZh ? '分' : 'pts'}</span>
                    </strong>
                    <span className="text-[9px] text-sky-200/80 block mt-0.5 font-sans">
                      {isZh ? 'RM 1 = 1 积分' : 'RM 1 = 1 Point'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/15 flex justify-between items-center text-xs text-sky-100/90">
                  <div>
                    <span className="text-[9px] text-sky-200/70 block uppercase">Member Username</span>
                    <span className="font-mono font-medium">@{currentUser.username}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-sky-200/70 block uppercase">Helpline Linked</span>
                    <span className="font-mono font-medium">{currentUser.phoneNumber}</span>
                  </div>
                </div>
              </div>

              {/* Profile Details (View & Edit Form) */}
              <div className="rhs-panel-soft border rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center">
                    <MapPin className="w-4 h-4 text-sky-500 mr-1.5" />
                    {isZh ? '保存的默认配送地址' : 'Saved Shipping Details'}
                  </h4>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-500 cursor-pointer"
                  >
                    {isEditing ? (isZh ? '取消修改' : 'Cancel') : (isZh ? '修改资料' : 'Edit Info')}
                  </button>
                </div>

                {isEditing ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          {isZh ? '收件人姓名' : 'Full Name'}
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          {isZh ? '电话号码' : 'Phone Number'}
                        </label>
                        <input
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        {isZh ? '电子邮箱 (选填)' : 'Email (Optional)'}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        {isZh ? '详细地址' : 'Shipping Address'}
                      </label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          {isZh ? '城市' : 'City'}
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full text-xs px-2.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          {isZh ? '州属' : 'State'}
                        </label>
                        <select
                          value={stateName}
                          onChange={(e) => setStateName(e.target.value)}
                          className="w-full text-xs px-2 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                        >
                          <option value="Pahang">Pahang</option>
                          <option value="Selangor">Selangor</option>
                          <option value="Kuala Lumpur">Kuala Lumpur</option>
                          <option value="Johor">Johor</option>
                          <option value="Penang">Penang</option>
                          <option value="Perak">Perak</option>
                          <option value="Melaka">Melaka</option>
                          <option value="Negeri Sembilan">Negeri Sembilan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          {isZh ? '邮编' : 'Postcode'}
                        </label>
                        <input
                          type="text"
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value)}
                          className="w-full text-xs px-2.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isZh ? '保存修改资料' : 'Save Profiles'}</span>
                    </button>
                  </form>
                ) : (
                  <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                    <p className="flex justify-between">
                      <span className="text-slate-400">{isZh ? '收件姓名:' : 'Recipient Name:'}</span>
                      <span className="text-slate-800 font-medium">{currentUser.fullName}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">{isZh ? '联络电话:' : 'Contact Phone:'}</span>
                      <span className="text-slate-800 font-mono">{currentUser.phoneNumber}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">{isZh ? '常用地址:' : 'Default Address:'}</span>
                      <span className="text-slate-800 text-right max-w-[70%]">
                        {currentUser.address
                          ? `${currentUser.address}, ${currentUser.postcode} ${currentUser.city}, ${currentUser.state}`
                          : (isZh ? '暂未填写默认地址' : 'Address not set yet')}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Personal Orders History inside Dashboard */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center">
                  <ShoppingBag className="w-4 h-4 text-sky-500 mr-1.5" />
                  {isZh ? '我的历史消费订单' : 'My Loyalty Purchases'}
                  <span className="bg-sky-50 text-sky-600 border border-sky-100 text-[10px] font-mono px-2 py-0.5 rounded-full ml-2">
                    {userOrders.length}
                  </span>
                </h4>

                {userOrders.length === 0 ? (
                  <div className="text-center py-6 rhs-panel-soft border border-dashed rounded-xl">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1.5 animate-pulse" />
                    <p className="text-xs text-slate-400">
                      {isZh ? '您目前还没有提交过订单。' : 'No saved orders under this profile yet.'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isZh ? '下单时登录即可累积会员积分！' : 'Earn loyalty points on your next purchase!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                    {userOrders.map((order, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg text-xs flex justify-between items-center shadow-xs">
                        <div>
                          <p className="font-mono font-bold text-sky-600">ID: #{order.id}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{order.date}</p>
                          <p className="text-[10px] text-slate-600 mt-1 truncate max-w-[200px]">
                            {order.items.map((it: any) => `${it.quantity}x ${isZh ? it.product.nameZh : it.product.nameEn}`).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <strong className="text-slate-800 font-mono">RM {order.total.toFixed(2)}</strong>
                          <span className="text-[9px] bg-amber-50 border border-amber-100 text-amber-600 block mt-1 py-0.5 px-1.5 rounded-md font-bold">
                            +{Math.round(order.total)} {isZh ? '积分' : 'pts'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isZh ? '安全注销' : 'Sign Out'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
                >
                  {isZh ? (isModal ? '好的，返回浏览' : '继续购物') : (isModal ? 'Done, Close' : 'Continue shopping')}
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* AUTH FORM: LOGIN OR SIGNUP                                      */
            /* ============================================================== */
            <div className="space-y-5">
              {/* Custom dual tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => {
                    setTab('login');
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tab === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isZh ? '登 录' : 'Sign In'}
                </button>
                <button
                  onClick={() => {
                    setTab('signup');
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tab === 'signup'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isZh ? '注册成为会员' : 'Sign Up'}
                </button>
              </div>

              {tab === 'login' ? (
                /* LOGIN FORM */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isZh ? '用户名' : 'Username'}
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder={isZh ? '请输入会员用户名' : 'Enter member username'}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isZh ? '安全密码' : 'Password'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={isZh ? '请输入您的密码' : 'Enter account password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full text-xs pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center justify-center space-x-1.5"
                  >
                    <span>{isZh ? '确 认 登 录' : 'S I G N   I N'}</span>
                  </button>
                </form>
              ) : (
                /* SIGNUP FORM */
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Phase 1: Account credentials */}
                  <div className="rhs-panel-soft border p-3 rounded-xl space-y-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      {isZh ? '1. 账户凭证' : '1. Account credentials'}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {isZh ? '用户名 *' : 'Username *'}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. jason88"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {isZh ? '安全密码 *' : 'Password *'}
                        </label>
                        <input
                          type="password"
                          placeholder="••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phase 2: Personal & Shipping details */}
                  <div className="rhs-panel-soft border p-3 rounded-xl space-y-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      {isZh ? '2. 配送联络信息 (以便下单时一键自动填单)' : '2. Default shipping information (For fast checkout)'}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {isZh ? '收件人姓名 *' : 'Recipient Full Name *'}
                        </label>
                        <input
                          type="text"
                          placeholder={isZh ? '真实姓名' : 'Full name'}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {isZh ? '联络电话 *' : 'Mobile Phone *'}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 0187682528"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">
                        {isZh ? '常用电子邮箱' : 'Email address'}
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. consumer@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">
                        {isZh ? '收货详细地址 (选填)' : 'Full Delivery Address (Optional)'}
                      </label>
                      <input
                        type="text"
                        placeholder={isZh ? '街道、门牌号码' : 'No. xx, Lorong, Road name'}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {isZh ? '城市 (选填)' : 'City (Opt)'}
                        </label>
                        <input
                          type="text"
                          placeholder="Raub"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full text-xs px-2 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {isZh ? '州属 (选填)' : 'State'}
                        </label>
                        <select
                          value={stateName}
                          onChange={(e) => setStateName(e.target.value)}
                          className="w-full text-xs px-1.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                        >
                          <option value="Pahang">Pahang</option>
                          <option value="Selangor">Selangor</option>
                          <option value="Kuala Lumpur">Kuala Lumpur</option>
                          <option value="Johor">Johor</option>
                          <option value="Penang">Penang</option>
                          <option value="Perak">Perak</option>
                          <option value="Melaka">Melaka</option>
                          <option value="Negeri Sembilan">Negeri Sembilan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {isZh ? '邮编 (选填)' : 'Postcode'}
                        </label>
                        <input
                          type="text"
                          placeholder="27600"
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value)}
                          className="w-full text-xs px-2 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center justify-center space-x-1.5"
                  >
                    <span>{isZh ? '确 认 注 册' : 'S I G N   U P   N O W'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
    </motion.div>
  );

  if (!isModal) return panel;

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} />
      {panel}
    </div>
  );
}
