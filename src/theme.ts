export const COLORS = {
  primary: '#8B4513',
  primaryLight: '#A0522D',
  accent: '#D4A017',
  background: '#F7F4F0',
  white: '#FFFFFF',
  card: '#FFFFFF',
  danger: '#E53935',
  dangerLight: '#FFEBEE',
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#F57C00',
  warningLight: '#FFF3E0',
  text: '#1A1A1A',
  textSecondary: '#757575',
  border: '#E0E0E0',
  inputBg: '#F5F5F5',
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium: { fontFamily: 'System', fontWeight: '500' as const },
  semibold: { fontFamily: 'System', fontWeight: '600' as const },
  bold: { fontFamily: 'System', fontWeight: '700' as const },
};
