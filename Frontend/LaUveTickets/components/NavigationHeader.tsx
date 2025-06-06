import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface NavigationHeaderProps {
  availableYears?: string[];
  selectedYear?: string | null;
  onYearChange?: (year: string | null) => void;
}

export function NavigationHeader({ 
  availableYears, 
  selectedYear, 
  onYearChange
}: NavigationHeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [showYearModal, setShowYearModal] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 600;
  const theme = useTheme();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleYearSelect = (year: string | null) => {
    onYearChange?.(year);
    setShowYearModal(false);
  };

  const YearSelector = () => (
    <Modal
      visible={showYearModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowYearModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowYearModal(false)}
      >
        <ThemedView type="card" style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">Seleccionar Año</ThemedText>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowYearModal(false)}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {availableYears?.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.optionItem,
                  selectedYear === year && { backgroundColor: `${theme.buttonPrimary}20` }
                ]}
                onPress={() => handleYearSelect(year)}
              >
                <ThemedText style={[
                  styles.optionText,
                  selectedYear === year && { color: theme.buttonPrimary, fontWeight: '600' }
                ]}>
                  {year}
                </ThemedText>
                {selectedYear === year && (
                  <Ionicons name="checkmark" size={20} color={theme.buttonPrimary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
      </TouchableOpacity>
    </Modal>
  );

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderBottomWidth: 1,
      minHeight: 60,
    },
    navButtons: {
      flexDirection: 'row',
      gap: 12,
      flex: 1,
    },
    navButtonsSmall: {
      gap: 8,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    navButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.inputBackground,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    navButtonSmall: {
      padding: 6,
      borderRadius: 6,
    },
    yearSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: 120,
      maxWidth: 140,
      borderWidth: 1,
      borderRadius: 25,
    },
    yearSelectorSmall: {
      minWidth: 100,
      maxWidth: 120,
    },
    yearText: {
      fontSize: 14,
      marginRight: 8,
    },
    yearTextSmall: {
      fontSize: 12,
    },
    logoutButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.inputBackground,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    logoutButtonSmall: {
      padding: 6,
      borderRadius: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '80%',
      maxWidth: 400,
      borderRadius: 12,
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    closeButton: {
      padding: 8,
    },
    optionsList: {
      maxHeight: 300,
    },
    optionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    optionText: {
      fontSize: 16,
    },
  });

  return (
    <ThemedView type="card" style={styles.header}>
      <View style={[styles.navButtons, isSmallScreen && styles.navButtonsSmall]}>
        <TouchableOpacity 
          style={[styles.navButton, isSmallScreen && styles.navButtonSmall]} 
          onPress={() => router.push('/tickets')}
        >
          <Ionicons name="ticket" size={isSmallScreen ? 20 : 24} color={theme.buttonPrimary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, isSmallScreen && styles.navButtonSmall]} 
          onPress={() => router.push('/ferias')}
        >
          <Ionicons name="calendar" size={isSmallScreen ? 20 : 24} color={theme.buttonPrimary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, isSmallScreen && styles.navButtonSmall]} 
          onPress={() => router.push('/graficos-tickets')}
        >
          <Ionicons name="bar-chart" size={isSmallScreen ? 20 : 24} color={theme.buttonPrimary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, isSmallScreen && styles.navButtonSmall]} 
          onPress={() => router.push('/graficos-ferias')}
        >
          <Ionicons name="pie-chart" size={isSmallScreen ? 20 : 24} color={theme.buttonPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.rightSection}>
        {availableYears && availableYears.length > 0 && selectedYear !== undefined && onYearChange && (
          <TouchableOpacity
            style={[styles.yearSelector, isSmallScreen && styles.yearSelectorSmall, {
              backgroundColor: theme.inputBackground,
              borderColor: theme.border
            }]}
            onPress={() => setShowYearModal(true)}
          >
            <ThemedText style={[styles.yearText, isSmallScreen && styles.yearTextSmall]} numberOfLines={1}>
              {selectedYear || 'Año'}
            </ThemedText>
            <Ionicons name="chevron-down" size={16} color={theme.buttonPrimary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          onPress={handleLogout} 
          style={[styles.logoutButton, isSmallScreen && styles.logoutButtonSmall]}
        >
          <Ionicons name="log-out" size={isSmallScreen ? 20 : 24} color={theme.error} />
        </TouchableOpacity>
      </View>

      <YearSelector />
    </ThemedView>
  );
}