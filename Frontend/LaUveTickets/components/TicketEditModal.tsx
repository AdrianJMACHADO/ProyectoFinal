import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme
} from 'react-native';
import { Feria, Ticket } from '../app/tickets';

// Caracteres especiales a filtrar de los inputs (para seguridad)
const inputFilterRegex = /[;"'=\\<>]/g;

interface TicketEditModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (ticket: Partial<Ticket>) => Promise<void>;
  ticket?: Ticket;
  ferias: Feria[];
  isCreating: boolean;
  isLoading: boolean;
  error: string | null;
}

// Colores optimizados
const colors = {
  light: {
    background: '#ffffff',
    text: '#1a1a1a',
    inputBackground: '#f0f0f0',
    border: '#cccccc',
    modalBackground: 'rgba(0, 0, 0, 0.5)',
    buttonPrimary: '#007AFF',
    buttonDanger: '#FF3B30',
    placeholder: '#888888',
    card: '#ffffff',
    shadow: '#000',
    pickerSelected: '#007AFF',
    pickerText: '#1a1a1a',
    sectionHeader: '#6d6d6d',
    dropdownBackground: '#ffffff',
    dropdownBorder: '#cccccc',
    dropdownText: '#333333',
  },
  dark: {
    background: '#121212',
    text: '#f0f0f0',
    inputBackground: '#1e1e1e',
    border: '#444444',
    modalBackground: 'rgba(0, 0, 0, 0.8)',
    buttonPrimary: '#0a84ff',
    buttonDanger: '#ff453a',
    placeholder: '#aaaaaa',
    card: '#1e1e1e',
    shadow: '#fff',
    pickerSelected: '#0a84ff',
    pickerText: '#f0f0f0',
    sectionHeader: '#aaaaaa',
    dropdownBackground: '#2a2a2a',
    dropdownBorder: '#555555',
    dropdownText: '#f0f0f0',
  }
};

export const TicketEditModal: React.FC<TicketEditModalProps> = ({
  isVisible,
  onClose,
  onSave,
  ticket,
  ferias,
  isCreating,
  isLoading,
  error,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || 'light'];
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [currentDropdown, setCurrentDropdown] = useState<'feria' | 'estado' | null>(null);
  const dropdownRef = useRef<View>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const nombreInputRef = useRef<TextInput>(null);
  const tipoInputRef = useRef<TextInput>(null);
  const cantidadInputRef = useRef<TextInput>(null);
  const usosInputRef = useRef<TextInput>(null);

  const [form, setForm] = useState<Partial<Ticket>>({
    idTicket: ticket?.idTicket,
    idFeria: ticket?.idFeria,
    nombre: ticket?.nombre || '',
    tipo: ticket?.tipo || '',
    cantidad_inicial: ticket?.cantidad_inicial || 0,
    usos: ticket?.usos || 0,
    estado: ticket?.estado || 'ACTIVO',
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (ticket) {
      setForm({
        idTicket: ticket.idTicket,
        idFeria: ticket.idFeria === undefined ? null : ticket.idFeria,
        nombre: ticket.nombre || '',
        tipo: ticket.tipo || '',
        cantidad_inicial: ticket.cantidad_inicial === undefined ? 0 : ticket.cantidad_inicial,
        usos: ticket.usos === undefined ? 0 : ticket.usos,
        estado: ticket.estado || 'ACTIVO',
      });
    } else {
      setForm({
        idTicket: undefined,
        idFeria: null,
        nombre: '',
        tipo: '',
        cantidad_inicial: 0,
        usos: 0,
        estado: 'ACTIVO',
      });
    }
    setFormErrors({});
  }, [ticket]);

  useEffect(() => {
    if (!isVisible) {
      setFormErrors({});
      setDropdownVisible(false);
      setCurrentDropdown(null);
    }
  }, [isVisible]);

  const validate = () => {
    const errors: { nombre?: string; tipo?: string; cantidad_inicial?: string; idFeria?: string; usos?: string } = {};
    if (!form.nombre || !form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!form.tipo || !form.tipo.trim()) errors.tipo = 'El tipo es obligatorio';
    if (isCreating && (form.cantidad_inicial === undefined || form.cantidad_inicial === null || form.cantidad_inicial < 0))
      errors.cantidad_inicial = 'La cantidad inicial debe ser un número positivo al crear';

    if (isCreating && (form.idFeria === undefined || form.idFeria === null)) {
      errors.idFeria = 'Debe seleccionar una feria';
    }

    // Validación para usos en modo edición
    if (!isCreating && form.usos !== undefined && form.cantidad_inicial !== undefined && form.usos > form.cantidad_inicial) {
        errors.usos = 'Los usos no pueden ser mayores que la cantidad inicial';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      // Lógica para autocompletar el tipo al crear si se introduce un número
      let tipoToSave = form.tipo;
      if (isCreating && tipoToSave) {
          const tipoNumber = parseInt(tipoToSave);
          if (!isNaN(tipoNumber)) {
              switch (tipoNumber) {
                  case 0:
                      tipoToSave = "Invitación";
                      break;
                  case 1:
                      tipoToSave = "2x1";
                      break;
                  case 3:
                      tipoToSave = "50%dto";
                      break;
                  // Si es otro número, se deja el número ingresado o se valida si es necesario
                  // Por ahora, solo reemplazamos 0, 1, 3.
              }
          }
      }

      await onSave({ ...form, tipo: tipoToSave });
    }
  };

  const toggleDropdown = (type: 'feria' | 'estado') => {
    Keyboard.dismiss();

    // Cierra el dropdown si ya está abierto para el mismo tipo
    if (dropdownVisible && currentDropdown === type) {
        setDropdownVisible(false);
        setCurrentDropdown(null);
        return;
    }
    
    // Abre el dropdown para el tipo seleccionado
    setCurrentDropdown(type);
    // Esperar a que el ref se adjunte al elemento correcto
    setTimeout(() => {
      if (dropdownRef.current) {
        dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
          setDropdownPosition({
            top: pageY + height + 4,
            left: pageX,
            width: width
          });
          setDropdownVisible(true);
        });
      }
    }, 50); // Pequeño retraso para asegurar que el ref está listo
  };

  const handleSelectOption = (value: string | number) => {
    if (currentDropdown === 'feria') {
      setForm((f: Partial<Ticket>) => ({ ...f, idFeria: value !== '' ? Number(value) : null }));
    } else if (currentDropdown === 'estado') {
      setForm((f: Partial<Ticket>) => ({ ...f, estado: value as 'ACTIVO' | 'INACTIVO' }));
    }
    setDropdownVisible(false);
  };

  const selectedFeriaName = form.idFeria 
    ? ferias.find((f: Feria) => f.idFeria === form.idFeria)?.nombre 
    : 'Selecciona una Feria';

  // Estilos dinámicos
  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.modalBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.card,
      padding: 25,
      borderRadius: 12,
      width: '90%',
      maxWidth: 450,
      maxHeight: '90%',
      elevation: 8,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      color: theme.text,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    inputGroup: {
      marginBottom: 18,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 14,
      fontSize: 16,
      backgroundColor: theme.inputBackground,
      color: theme.text,
    },
    inputError: {
      borderColor: '#ff3b30',
      borderWidth: 1.5,
    },
    errorText: {
      color: '#ff3b30',
      fontSize: 14,
      marginTop: 6,
      fontWeight: '500',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 25,
      gap: 12,
    },
    saveErrorText: {
      color: '#ff3b30',
      textAlign: 'center',
      marginBottom: 15,
      fontWeight: '600',
      fontSize: 15,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    saveButton: {
      backgroundColor: theme.buttonPrimary,
    },
    cancelButton: {
      backgroundColor: theme.buttonDanger,
    },
    buttonText: {
      color: 'white',
      textAlign: 'center',
      fontSize: 17,
      fontWeight: 'bold',
    },
    disabledInput: {
      backgroundColor: theme.inputBackground,
      color: theme.placeholder,
    },
    pickerWrapper: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.inputBackground,
      padding: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerText: {
      fontSize: 16,
      color: theme.text,
      flex: 1,
    },
    pickerPlaceholder: {
      color: theme.placeholder,
    },
    dropdownContainer: {
      position: 'absolute',
      backgroundColor: theme.dropdownBackground,
      borderWidth: 1,
      borderColor: theme.dropdownBorder,
      borderRadius: 8,
      padding: 10,
      maxHeight: 200,
      zIndex: 1000,
      elevation: 10,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    dropdownItem: {
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    dropdownItemText: {
      fontSize: 16,
      color: theme.dropdownText,
    },
    dropdownItemSelected: {
      backgroundColor: `${theme.buttonPrimary}20`,
    },
    dropdownItemSelectedText: {
      fontWeight: 'bold',
      color: theme.buttonPrimary,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 20,
    },
    icon: {
      marginLeft: 10,
    }
  });

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={() => {
        setDropdownVisible(false);
        if (Platform.OS === 'web') {
          onClose();
        }
      }}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {dropdownVisible && (
            <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
          )}

          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isCreating ? 'Crear Ticket' : 'Editar Ticket'}</Text>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
              {isCreating && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Feria</Text>
                  <TouchableOpacity
                    style={[styles.pickerWrapper, formErrors.idFeria && styles.inputError]}
                    onPress={() => toggleDropdown('feria')}
                    ref={currentDropdown === 'feria' ? dropdownRef : null}
                  >
                    <Text style={[
                      styles.pickerText,
                      !form.idFeria && styles.pickerPlaceholder
                    ]}>
                      {selectedFeriaName}
                    </Text>
                    <Ionicons
                      name={dropdownVisible && currentDropdown === 'feria' ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={theme.text}
                      style={styles.icon}
                    />
                  </TouchableOpacity>
                  {formErrors.idFeria && <Text style={styles.errorText}>{formErrors.idFeria}</Text>}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  ref={nombreInputRef}
                  style={[styles.input, formErrors.nombre && styles.inputError]}
                  placeholder="Nombre del Ticket"
                  placeholderTextColor={theme.placeholder}
                  value={form.nombre}
                  onChangeText={(text) => setForm(f => ({ ...f, nombre: text.replace(inputFilterRegex, '') }))}
                  returnKeyType="next"
                  onSubmitEditing={() => tipoInputRef.current?.focus()}
                />
                {formErrors.nombre && <Text style={styles.errorText}>{formErrors.nombre}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tipo</Text>
                <TextInput
                  ref={tipoInputRef}
                  style={[styles.input, formErrors.tipo && styles.inputError]}
                  placeholder="Tipo (0: Invitación, 1: 2x1, 3: 50%dto)"
                  placeholderTextColor={theme.placeholder}
                  value={form.tipo}
                  onChangeText={(text) => setForm(f => ({ ...f, tipo: text.replace(inputFilterRegex, '') }))}
                  returnKeyType={isCreating ? "next" : "done"}
                  onSubmitEditing={() => {
                    if (isCreating) {
                      cantidadInputRef.current?.focus();
                    } else {
                      Keyboard.dismiss();
                    }
                  }}
                />
                {formErrors.tipo && <Text style={styles.errorText}>{formErrors.tipo}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cantidad Inicial</Text>
                <TextInput
                  ref={cantidadInputRef}
                  style={[styles.input, !isCreating && styles.disabledInput, formErrors.cantidad_inicial && styles.inputError]}
                  placeholder="Cantidad inicial de usos"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="numeric"
                  value={form.cantidad_inicial != null ? form.cantidad_inicial.toString() : ''}
                  onChangeText={(text) => setForm(f => ({ ...f, cantidad_inicial: parseInt(text) || 0 }))}
                  editable={isCreating}
                  returnKeyType={isCreating ? "done" : "next"}
                  onSubmitEditing={() => {
                    if (isCreating) {
                      Keyboard.dismiss();
                    } else {
                      usosInputRef.current?.focus();
                    }
                  }}
                />
                {formErrors.cantidad_inicial && <Text style={styles.errorText}>{formErrors.cantidad_inicial}</Text>}
              </View>

              {!isCreating && (
                <>
                  <View style={styles.sectionDivider} />

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Usos</Text>
                    <TextInput
                      ref={usosInputRef}
                      style={[styles.input, formErrors.usos && styles.inputError]}
                      placeholder="Usos actuales"
                      placeholderTextColor={theme.placeholder}
                      keyboardType="numeric"
                      value={form.usos != null ? form.usos.toString() : ''}
                      onChangeText={(text) => setForm(f => ({ ...f, usos: parseInt(text) || 0 }))}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    {formErrors.usos && <Text style={styles.errorText}>{formErrors.usos}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Estado</Text>
                    <TouchableOpacity
                      style={[styles.pickerWrapper]}
                      onPress={() => toggleDropdown('estado')}
                      ref={currentDropdown === 'estado' ? dropdownRef : null}
                    >
                      <Text style={styles.pickerText}>{form.estado || 'ACTIVO'}</Text>
                      <Ionicons
                        name={dropdownVisible && currentDropdown === 'estado' ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={theme.text}
                        style={styles.icon}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {error && <Text style={styles.saveErrorText}>{error}</Text>}
            </ScrollView>

            <View style={styles.modalButtons}>
              {isLoading ? (
                <ActivityIndicator size="large" color={theme.buttonPrimary} />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSave}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>{isCreating ? 'Crear' : 'Guardar Cambios'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={onClose}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {dropdownVisible && (
            <View style={[
              styles.dropdownContainer,
              {
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width
              }
            ]}>
              <ScrollView>
                {currentDropdown === 'feria' && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        !form.idFeria && styles.dropdownItemSelected
                      ]}
                      onPress={() => handleSelectOption('')}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        !form.idFeria && styles.dropdownItemSelectedText
                      ]}>
                        Selecciona una Feria
                      </Text>
                    </TouchableOpacity>

                    {ferias.map(feria => (
                      <TouchableOpacity
                        key={feria.idFeria}
                        style={[
                          styles.dropdownItem,
                          form.idFeria === feria.idFeria && styles.dropdownItemSelected
                        ]}
                        onPress={() => handleSelectOption(feria.idFeria)}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          form.idFeria === feria.idFeria && styles.dropdownItemSelectedText
                        ]}>
                          {feria.nombre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {currentDropdown === 'estado' && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        form.estado === 'ACTIVO' && styles.dropdownItemSelected
                      ]}
                      onPress={() => handleSelectOption('ACTIVO')}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        form.estado === 'ACTIVO' && styles.dropdownItemSelectedText
                      ]}>
                        ACTIVO
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        form.estado === 'INACTIVO' && styles.dropdownItemSelected
                      ]}
                      onPress={() => handleSelectOption('INACTIVO')}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        form.estado === 'INACTIVO' && styles.dropdownItemSelectedText
                      ]}>
                        INACTIVO
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};