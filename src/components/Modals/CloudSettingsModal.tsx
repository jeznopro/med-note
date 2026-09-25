import React, { useState, useRef } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  LogOut,
  X,
  Folder,
  ShieldCheck,
  Key,
  AlertCircle,
  ExternalLink,
  Download,
  Upload,
  HardDrive,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mail,
  User,
} from 'lucide-react';
import { GoogleDriveIcon, GoogleIcon } from '../Icons/GoogleIcons';
import { GoogleDriveService, type CloudAccount, type SyncStatusInfo } from '../../services/googleDrive';
import { exportLibraryToJson, importLibraryFromJson } from '../../services/backupService';
import type { Notebook, Folder as FolderType } from '../../types/document';

interface CloudSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: CloudAccount | null;
  syncInfo: SyncStatusInfo;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  onSignIn: (clientId?: string, userProfile?: { email?: string; name?: string }) => Promise<void>;
  onSignOut: () => void;
  onManualSync: () => Promise<void>;
  isDarkMode: boolean;
  notebooks?: Notebook[];
  folders?: FolderType[];
  onRestoreLibrary?: (notebooks: Notebook[], folders: FolderType[]) => void;
}

export const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({
  isOpen,
  onClose,
  account,
  syncInfo,
  autoSyncEnabled,
  onToggleAutoSync,
  onSignIn,
  onSignOut,
  onManualSync,
  isDarkMode,
  notebooks = [],
  folders = [],
  onRestoreLibrary,
}) => {
  const gdrive = GoogleDriveService.getInstance();
  const [activeTab, setActiveTab] = useState<'drive' | 'offline'>('drive');
  const [fastEmail, setFastEmail] = useState('bacsy.tuonglai@gmail.com');
  const [fastName, setFastName] = useState('Bác sĩ / Sinh viên Y khoa');
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(() => {
    const saved = gdrive.getClientId();
    return saved.includes('YOUR_GOOGLE_CLIENT_ID') ? '' : saved;
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [isCleaningJson, setIsCleaningJson] = useState(false);
  const [cleanJsonMsg, setCleanJsonMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5173';

  const handleCopyOrigin = () => {
    navigator.clipboard.writeText(currentOrigin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  const handleCleanOldJson = async () => {
    if (!account) return;
    setIsCleaningJson(true);
    setCleanJsonMsg(null);
    try {
      const deleted = await gdrive.deleteOldJsonBackups(account);
      setCleanJsonMsg(`Đã dọn dẹp ${deleted} file .mednote.json cũ! Thư mục Drive giờ chỉ chứa file .pdf`);
      setTimeout(() => setCleanJsonMsg(null), 5000);
    } catch (e) {
      setCleanJsonMsg('Không thể dọn dẹp: ' + (e as Error).message);
    } finally {
      setIsCleaningJson(false);
    }
  };

  // 1-Click Fast Login
  const handleFastSignIn = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await onSignIn('FAST_LOGIN', {
        email: fastEmail.trim() || 'bacsy.tuonglai@gmail.com',
        name: fastName.trim() || 'Bác sĩ / Sinh viên Y khoa',
      });
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Không thể đăng nhập.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Google Cloud Real OAuth 2.0
  const handleRealGoogleOAuth = async () => {
    if (!clientIdInput.trim()) {
      setErrorMessage('Vui lòng dán Google Client ID của bạn ở ô bên dưới trước khi đăng nhập.');
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await onSignIn(clientIdInput.trim());
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Đăng nhập Google thất bại. Vui lòng kiểm tra lại Client ID.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOfflineExport = () => {
    exportLibraryToJson(notebooks, folders);
    setBackupSuccessMsg('Đã tải file sao lưu về máy thành công!');
    setTimeout(() => setBackupSuccessMsg(null), 3000);
  };

  const handleOfflineRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importLibraryFromJson(file);
      if (onRestoreLibrary) {
        onRestoreLibrary(data.notebooks, data.folders);
        setBackupSuccessMsg(`Đã khôi phục thành công ${data.notebooks.length} sổ tay!`);
        setTimeout(() => setBackupSuccessMsg(null), 3000);
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Lỗi khi khôi phục dữ liệu.');
    }
    e.target.value = '';
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Chưa sao lưu';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-in fade-in duration-200">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleRestoreFileChange}
      />

      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Modal Header */}
        <div className="h-14 px-6 border-b flex items-center justify-between border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center">
              <GoogleDriveIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Sao lưu & Đăng nhập Google Drive</h2>
              <p className="text-[10px] text-zinc-400">Tự động sao lưu dữ liệu ngầm phong cách GoodNotes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs (Google Drive vs Offline Backup) */}
        <div className="flex border-b border-inherit px-6 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('drive')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'drive'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <GoogleDriveIcon className="w-3.5 h-3.5" />
            <span>Google Drive (Tự động)</span>
          </button>

          <button
            onClick={() => setActiveTab('offline')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'offline'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Sao lưu máy tính (Offline)</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {activeTab === 'drive' ? (
            <>
              {/* 1. Account Status */}
              {account ? (
                /* Connected State */
                <div
                  className={`p-4 rounded-xl border space-y-3.5 ${
                    isDarkMode ? 'bg-zinc-800/60 border-zinc-700' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {account.picture ? (
                        <img
                          src={account.picture}
                          alt={account.name}
                          className="w-11 h-11 rounded-full border border-slate-200 dark:border-zinc-700 object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                          {account.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">{account.name}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã kết nối Google Drive
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{account.email}</div>
                      </div>
                    </div>

                    <button
                      onClick={onSignOut}
                      title="Đăng xuất khỏi Google Drive"
                      className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded-lg cursor-pointer text-xs font-semibold transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>

                  {/* Clarification Alert if using local cache mode */}
                  {account.accessToken.startsWith('demo_token_') && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Dữ liệu đang lưu an toàn trên máy bạn (Chưa tải lên drive.google.com thật)</span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        Vì lý do bảo mật của Google, để thư mục <code>MedNotes_Backup</code> tự động xuất hiện trên ứng dụng <strong>drive.google.com</strong> thật, bạn cần bấm xác thực tài khoản Google qua <strong>Google Cloud OAuth Client ID</strong>.
                      </p>
                      <div className="pt-0.5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSignOut();
                            setShowAdvancedOAuth(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs"
                        >
                          ⚙️ Thiết lập kết nối Google Drive thật
                        </button>
                        <button
                          type="button"
                          onClick={handleOfflineExport}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-semibold text-[11px] cursor-pointer"
                        >
                          📥 Tải file sao lưu về máy (.json)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sync Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-inherit">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/50">
                      <div className="text-[10px] text-zinc-400">Thư mục trên Drive của bạn</div>
                      <div className="font-semibold flex items-center gap-1 mt-0.5 text-blue-600 dark:text-blue-400 truncate">
                        <Folder className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">MedNotes_Backup / [Môn học]</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/50">
                      <div className="text-[10px] text-zinc-400">Lần sao lưu gần nhất</div>
                      <div className="font-semibold mt-0.5 truncate text-slate-700 dark:text-zinc-200">
                        {formatLastSync(syncInfo.lastSyncTime)}
                      </div>
                    </div>
                  </div>

                  {/* Manual Sync Button */}
                  <button
                    onClick={onManualSync}
                    disabled={syncInfo.status === 'syncing'}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncInfo.status === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>{syncInfo.status === 'syncing' ? 'Đang đồng bộ PDF vào thư mục...' : 'Đồng bộ & Xuất PDF vào từng thư mục'}</span>
                  </button>

                  {/* Format indicator & Clean up old .json files button */}
                  <div className="pt-2 border-t border-inherit space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Cấu trúc lưu Drive:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Tự chia thư mục con + PDF chuẩn</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCleanOldJson}
                      disabled={isCleaningJson}
                      className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-300 font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {isCleaningJson ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang dọn dẹp...</span>
                        </>
                      ) : (
                        <span>🧹 Xóa sạch các file .json cũ trên Drive (Chỉ để lại file PDF)</span>
                      )}
                    </button>
                    {cleanJsonMsg && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 text-center font-medium">
                        {cleanJsonMsg}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Not Connected: High-Converting, Clear Login Options */
                <div className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Main Google Login Hero Box */}
                  <div
                    className={`p-5 rounded-2xl border text-center flex flex-col items-center gap-3.5 ${
                      isDarkMode
                        ? 'bg-gradient-to-b from-blue-950/30 to-zinc-900 border-zinc-700'
                        : 'bg-gradient-to-b from-blue-50/80 to-white border-blue-100 shadow-sm'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-md flex items-center justify-center">
                      <GoogleDriveIcon className="w-8 h-8" />
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                        Đăng nhập tài khoản Google Drive
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                        Tự động sao lưu toàn bộ sổ tay, bài giảng PDF và nét vẽ của bạn lên Google Drive. An toàn tuyệt đối, không lo mất dữ liệu học tập.
                      </p>
                    </div>

                    {/* Name & Email Input for Fast Login */}
                    <div className="w-full max-w-sm space-y-2.5 text-left pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 flex items-center gap-1 mb-1">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tên người dùng:</span>
                        </label>
                        <input
                          type="text"
                          value={fastName}
                          onChange={(e) => setFastName(e.target.value)}
                          placeholder="Bác sĩ / Sinh viên Y khoa"
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-hidden font-medium transition-all ${
                            isDarkMode
                              ? 'bg-zinc-900 border-zinc-700 focus:border-blue-500'
                              : 'bg-white border-slate-300 focus:border-blue-500 shadow-2xs'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 flex items-center gap-1 mb-1">
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          <span>Địa chỉ Gmail để sao lưu:</span>
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={fastEmail}
                            onChange={(e) => setFastEmail(e.target.value)}
                            placeholder="VD: minhtriet@gmail.com"
                            className={`w-full px-3.5 py-2.5 pl-9 rounded-xl border text-xs outline-hidden font-medium transition-all ${
                              isDarkMode
                                ? 'bg-zinc-900 border-zinc-700 focus:border-blue-500'
                                : 'bg-white border-slate-300 focus:border-blue-500 shadow-2xs'
                            }`}
                          />
                          <GoogleIcon className="w-4 h-4 absolute left-3 top-3" />
                        </div>
                      </div>
                    </div>

                    {/* Big Primary Sign In Button */}
                    <button
                      onClick={handleFastSignIn}
                      disabled={isProcessing}
                      className="w-full max-w-sm py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg cursor-pointer transition-all hover:scale-101 active:scale-99 disabled:opacity-50"
                    >
                      <GoogleIcon className="w-4 h-4 shrink-0 bg-white p-0.5 rounded-full" />
                      <span>{isProcessing ? 'Đang kết nối Google Drive...' : 'Đăng nhập Google Drive ngay'}</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tự động kích hoạt tính năng Auto-Backup khi dừng bút</span>
                    </div>
                  </div>

                  {/* Advanced Option: Official Google Cloud OAuth Client ID */}
                  <div
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isDarkMode ? 'bg-zinc-850 border-zinc-700' : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
                      className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-slate-400" />
                        <span>Hoặc kết nối bằng Google Cloud OAuth Client ID (Drive thật)</span>
                      </div>
                      {showAdvancedOAuth ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showAdvancedOAuth && (
                      <div className="p-4 pt-1 space-y-3 text-xs border-t border-inherit">
                        <ol className="list-decimal list-inside space-y-2 text-zinc-600 dark:text-zinc-300 text-[11px] leading-relaxed">
                          <li>
                            Mở{' '}
                            <a
                              href="https://console.cloud.google.com/apis/credentials"
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-0.5"
                            >
                              Google Cloud Console (Credentials) <ExternalLink className="w-3 h-3 inline" />
                            </a>
                            , bật <strong>Google Drive API</strong> và tạo <strong>OAuth client ID</strong> (loại <em>Web application</em>).
                          </li>
                          <li>
                            Tại <strong>Authorized JavaScript origins</strong>, thêm địa chỉ:
                            <div className="mt-1 flex items-center gap-2 bg-white dark:bg-zinc-900 p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                              <span className="truncate flex-1">{currentOrigin}</span>
                              <button
                                type="button"
                                onClick={handleCopyOrigin}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-zinc-500 cursor-pointer"
                                title="Sao chép địa chỉ"
                              >
                                {copiedOrigin ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </li>
                          <li>
                            Dán <strong>Client ID</strong> vào đây:
                          </li>
                        </ol>

                        <input
                          type="text"
                          value={clientIdInput}
                          onChange={(e) => setClientIdInput(e.target.value)}
                          placeholder="VD: 1234567890-abcdef.apps.googleusercontent.com"
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-hidden ${
                            isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'
                          }`}
                        />

                        <button
                          onClick={handleRealGoogleOAuth}
                          disabled={isProcessing}
                          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                        >
                          <Cloud className="w-4 h-4" />
                          <span>{isProcessing ? 'Đang kết nối...' : 'Đăng nhập với Google OAuth 2.0'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Auto Backup Toggle Switch */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-zinc-800/40 border-zinc-700/60' : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Tự động sao lưu (Auto-Backup)
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 max-w-sm">
                    Tự động đồng bộ ngầm toàn bộ nét vẽ và PDF lên Google Drive mỗi khi bạn viết xong.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => onToggleAutoSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Privacy & Security Note */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Bảo mật chuẩn GoodNotes (Scope <code>drive.file</code>):</strong> MedNotes chỉ có quyền đọc/ghi các file do chính ứng dụng tạo ra trong thư mục <code>MedNotes_Backup</code>. Tuyệt đối không can thiệp vào ảnh, thư từ hay tài liệu cá nhân khác của bạn.
                </p>
              </div>
            </>
          ) : (
            /* Offline Backup Tab */
            <div className="space-y-4 text-xs">
              {backupSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{backupSuccessMsg}</span>
                </div>
              )}

              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDarkMode ? 'bg-zinc-800/40 border-zinc-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Xuất file sao lưu tức thì (1-Click Offline Backup)</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Tải toàn bộ thư viện sổ tay ({notebooks.length} cuốn sổ, tất cả các trang Cornell, Ruled, Grid và nét vẽ) về máy tính dưới dạng file <code>.json</code>.
                </p>
                <button
                  onClick={handleOfflineExport}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải toàn bộ thư viện về máy (.json)</span>
                </button>
              </div>

              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDarkMode ? 'bg-zinc-800/40 border-zinc-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Khôi phục từ file sao lưu</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Chọn file sao lưu <code>MedNotes_Backup_*.json</code> để phục hồi toàn bộ sổ tay ngay lập tức.
                </p>
                <button
                  onClick={handleOfflineRestoreClick}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Chọn file để khôi phục</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
