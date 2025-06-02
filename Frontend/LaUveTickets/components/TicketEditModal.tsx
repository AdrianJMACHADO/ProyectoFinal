import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import { Ticket } from '../app/tickets';

type TicketEditModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onSave: (ticket: Partial<Ticket>) => void;
  ticket: Ticket;
  ferias: Array<{ idFeria: number; nombre: string }>;
  isCreating: boolean;
};

export const TicketEditModal: React.FC<TicketEditModalProps> = ({
  isVisible,
  onClose,
  onSave,
  ticket,
  ferias,
  isCreating,
}) => {
  const [form, setForm] = useState<Partial<Ticket>>({
    idTicket: ticket.idTicket,
    idFeria: ticket.idFeria,
    nombre: ticket.nombre,
    tipo: ticket.tipo,
    cantidad_inicial: ticket.cantidad_inicial,
    usos: ticket.usos,
    estado: ticket.estado,
    fecha_creacion: ticket.fecha_creacion,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Actualizar el formulario cuando cambie el ticket
  useEffect(() => {
    setForm({
      idTicket: ticket.idTicket,
      idFeria: ticket.idFeria,
      nombre: ticket.nombre,
      tipo: ticket.tipo,
      cantidad_inicial: ticket.cantidad_inicial,
      usos: ticket.usos,
      estado: ticket.estado,
      fecha_creacion: ticket.fecha_creacion,
    });
  }, [ticket]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.nombre?.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!form.tipo?.trim()) newErrors.tipo = 'El tipo es obligatorio';
    if (!form.estado?.trim()) newErrors.estado = 'El estado es obligatorio';
    if (form.usos !== undefined && form.usos < 0) newErrors.usos = 'Los usos no pueden ser negativos';
    if (isCreating && (!form.cantidad_inicial || form.cantidad_inicial <= 0)) newErrors.cantidad_inicial = 'La cantidad inicial debe ser mayor que 0';

    // Validar que idFeria esté seleccionado al crear
    if (isCreating && (form.idFeria === null || form.idFeria === undefined || form.idFeria === 0)) {
        newErrors.idFeria = 'Debe seleccionar una feria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(form);
      onClose();
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{isCreating ? 'Crear Ticket' : 'Editar Ticket'}</Text>
        {/* Indicador temporal para depuración */}
        <Text style={{ fontSize: 10, color: 'gray' }}>{`isCreating: ${isCreating}`}</Text>

        {/* Campo de Feria (solo al crear) */}
        {isCreating && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Feria</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.idFeria || ''}
                onValueChange={(itemValue) => setForm({ ...form, idFeria: itemValue !== '' ? Number(itemValue) : null })}
                style={styles.picker}
              >
                <Picker.Item label="Selecciona una Feria" value="" />
                {ferias.map(feria => (
                  <Picker.Item key={feria.idFeria} label={feria.nombre} value={String(feria.idFeria)} />
                ))}
              </Picker>
            </View>
            {errors.idFeria && <Text style={styles.errorText}>{errors.idFeria}</Text>}
          </View>
        )}

        {/* Campos editables */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={form.nombre}
            onChangeText={(text) => setForm({ ...form, nombre: text })}
            placeholder="Nombre del ticket"
          />
          {errors.nombre && <Text style={styles.errorText}>{errors.nombre}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tipo</Text>
          <TextInput
            style={styles.input}
            value={form.tipo}
            onChangeText={(text) => setForm({ ...form, tipo: text })}
            placeholder="Tipo de ticket"
          />
          {errors.tipo && <Text style={styles.errorText}>{errors.tipo}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cantidad Inicial</Text>
          <TextInput
            style={[styles.input, !isCreating && styles.disabledInput]}
            value={form.cantidad_inicial?.toString()}
            onChangeText={(text) => setForm({ ...form, cantidad_inicial: parseInt(text) || 0 })}
            placeholder="Cantidad inicial"
            keyboardType="numeric"
            editable={isCreating}
          />
          {errors.cantidad_inicial && <Text style={styles.errorText}>{errors.cantidad_inicial}</Text>}
        </View>

        {/* Campo Usos (solo visible y editable al editar) */}
        {!isCreating && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Usos</Text>
            <TextInput
              style={styles.input}
              value={form.usos?.toString()}
              onChangeText={(text) => setForm({ ...form, usos: parseInt(text) || 0 })}
              placeholder="Número de usos"
              keyboardType="numeric"
            />
            {errors.usos && <Text style={styles.errorText}>{errors.usos}</Text>}
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Estado</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={form.estado}
              onValueChange={(itemValue) => setForm({ ...form, estado: itemValue })}
              style={styles.picker}
            >
              <Picker.Item label="ACTIVO" value="ACTIVO" />
              <Picker.Item label="INACTIVO" value="INACTIVO" />
            </Picker>
          </View>
          {errors.estado && <Text style={styles.errorText}>{errors.estado}</Text>}
        </View>

        {/* Campo Fecha de Creación */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fecha de Creación</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={form.fecha_creacion ? format(new Date(form.fecha_creacion), 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                setForm({ ...form, fecha_creacion: e.target.value ? new Date(e.target.value).toISOString() : undefined });
              }}
              style={{ ...styles.input as any, paddingVertical: 10, paddingHorizontal: 10, height: 44, color: form.fecha_creacion ? '#222' : '#aaa'}}
            />
          ) : (
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={{ color: form.fecha_creacion ? '#222' : '#aaa' }}>
                {form.fecha_creacion ? format(new Date(form.fecha_creacion), 'dd/MM/yyyy') : 'Selecciona una fecha'}
              </Text>
            </TouchableOpacity>
          )}
          {showDatePicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={form.fecha_creacion ? new Date(form.fecha_creacion) : new Date()}
              mode="date"
              display="default"
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setForm({ ...form, fecha_creacion: date.toISOString() });
              }}
            />
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
            <Text style={styles.buttonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 500,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 5,
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
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
  },
}); 