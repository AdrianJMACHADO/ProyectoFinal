import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Picker } from '@react-native-picker/picker';

interface NavigationHeaderProps {
  availableYears?: string[];
  selectedYear?: string | null;
  onYearChange?: (year: string | null) => void;
}

export function NavigationHeader({ availableYears, selectedYear, onYearChange }: NavigationHeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.header}>
      <View style={styles.navButtons}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => router.push('/tickets')}
        >
          <Ionicons name="ticket" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => router.push('/ferias')}
        >
          <Ionicons name="calendar" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => router.push('/graficos-tickets')}
        >
          <Ionicons name="bar-chart" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => router.push('/graficos-ferias')}
        >
          <Ionicons name="pie-chart" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {availableYears && availableYears.length > 0 && selectedYear !== undefined && onYearChange && (
        <View style={styles.yearPickerContainer}>
          <Picker
            selectedValue={selectedYear}
            style={styles.yearPicker}
            dropdownIconColor="#007AFF"
            onValueChange={(itemValue: string | null) => onYearChange(itemValue)}
          >
            {availableYears.map(year => (
              <Picker.Item 
                key={year} 
                label={year} 
                value={year} 
                style={selectedYear === year ? styles.selectedItem : styles.pickerItem}
              />
            ))}
          </Picker>
        </View>
      )}

      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Ionicons name="log-out" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffebeb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  yearPickerContainer: {
    width: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25, // Bordes más redondeados
    justifyContent: 'center',
    height: 40,
    padding: 0,
    backgroundColor: '#f8f8f8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  yearPicker: {
    height: 40,
    color: '#333',
    fontWeight: '500',
  },
  pickerItem: {
    fontSize: 16,
    color: '#555',
  },
  selectedItem: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
});