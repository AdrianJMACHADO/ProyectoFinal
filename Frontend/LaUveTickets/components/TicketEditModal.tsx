import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feria, Ticket } from '../app/tickets';

type TicketEditModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onSave: (ticket: Partial<Ticket>) => Promise<void>;
  ticket: Partial<Ticket> | null;
  ferias: Feria[];
  isCreating: boolean;
  isLoading: boolean;
  error: string | null;
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
    }
  }, [isVisible]);

  const validate = () => {
    const errors: { nombre?: string; tipo?: string; cantidad_inicial?: string; idFeria?: string } = {};
    if (!form.nombre || !form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!form.tipo || !form.tipo.trim()) errors.tipo = 'El tipo es obligatorio';
    if (isCreating && (form.cantidad_inicial === undefined || form.cantidad_inicial === null || form.cantidad_inicial < 0)) errors.cantidad_inicial = 'La cantidad inicial debe ser un número positivo al crear';

    if (isCreating && (form.idFeria === undefined || form.idFeria === null)) {
        errors.idFeria = 'Debe seleccionar una feria';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      await onSave(form);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{isCreating ? 'Crear Ticket' : 'Editar Ticket'}</Text>

          {isCreating && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Feria</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={form.idFeria != null ? form.idFeria.toString() : ''}
                  onValueChange={(itemValue) => setForm(f => ({ ...f, idFeria: itemValue !== '' ? Number(itemValue) : null }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecciona una Feria" value="" />
                  {ferias.map(feria => (
                    <Picker.Item key={feria.idFeria} label={feria.nombre} value={String(feria.idFeria)} />
                  ))}
                </Picker>
              </View>
              {formErrors.idFeria && <Text style={styles.errorText}>{formErrors.idFeria}</Text>}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={[styles.input, formErrors.nombre && styles.inputError]}
              placeholder="Nombre del Ticket"
              value={form.nombre}
              onChangeText={(text) => setForm(f => ({ ...f, nombre: text }))}
            />
            {formErrors.nombre && <Text style={styles.errorText}>{formErrors.nombre}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo</Text>
            <TextInput
              style={[styles.input, formErrors.tipo && styles.inputError]}
              placeholder="Tipo (0: Invitación, 1: 2x1, 3: 50%dto)"
              value={form.tipo}
              onChangeText={(text) => setForm(f => ({ ...f, tipo: text }))}
            />
            {formErrors.tipo && <Text style={styles.errorText}>{formErrors.tipo}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cantidad Inicial</Text>
            <TextInput
              style={[styles.input, !isCreating && styles.disabledInput, formErrors.cantidad_inicial && styles.inputError]}
              placeholder="Cantidad inicial de usos"
              keyboardType="numeric"
              value={form.cantidad_inicial != null ? form.cantidad_inicial.toString() : ''}
              onChangeText={(text) => setForm(f => ({ ...f, cantidad_inicial: parseInt(text) || 0 }))}
              editable={isCreating}
            />
            {formErrors.cantidad_inicial && <Text style={styles.errorText}>{formErrors.cantidad_inicial}</Text>}
          </View>

          {!isCreating && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Usos</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Usos actuales"
                  keyboardType="numeric"
                  value={form.usos != null ? form.usos.toString() : ''}
                  onChangeText={(text) => setForm(f => ({ ...f, usos: parseInt(text) || 0 }))}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Estado</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={form.estado || 'ACTIVO'}
                    onValueChange={(itemValue) => setForm(f => ({ ...f, estado: itemValue }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="ACTIVO" value="ACTIVO" />
                    <Picker.Item label="INACTIVO" value="INACTIVO" />
                  </Picker>
                </View>
              </View>
            </>
          )}

          {error && <Text style={styles.saveErrorText}>{error}</Text>}

          <View style={styles.modalButtons}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={isLoading}>
                <Text style={styles.buttonText}>{isCreating ? 'Crear' : 'Guardar Cambios'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={isLoading}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
      borderColor: '#ff3b30',
  },
  errorText: {
      color: '#ff3b30',
      fontSize: 12,
      marginTop: 5,
  },
   readOnlyText: {
       fontSize: 16,
       padding: 10,
       backgroundColor: '#e9e9e9',
       borderRadius: 5,
       color: '#555',
   },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  saveErrorText: {
      color: '#ff3b30',
      textAlign: 'center',
      marginBottom: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledInput: {
    backgroundColor: '#e9e9e9',
    color: '#666',
  },
   pickerWrapper: {
       borderWidth: 1,
       borderColor: '#ddd',
       borderRadius: 5,
       backgroundColor: '#f9f9f9',
   },
   picker: {
       height: 50,
       width: '100%',
   },
}); 