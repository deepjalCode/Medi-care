import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

interface Patient {
  name: string;
  email: string;
  password: string;
  phone: string;
  age: string;
  gender: string;
  registeredAt?: Date;
}

interface PatientRegistrationProps {
  onRegister: (patient: Patient) => void;
  onBack: () => void;
  existingPatients: { email: string }[];
}

const PatientRegistration: React.FC<PatientRegistrationProps> = ({
  onRegister,
  onBack,
  existingPatients,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    } else if (existingPatients.some((p) => p.email.toLowerCase() === email.toLowerCase())) {
      newErrors.email = 'Patient with this email already registered';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!age.trim()) {
      newErrors.age = 'Age is required';
    } else if (isNaN(Number(age)) || Number(age) < 1 || Number(age) > 150) {
      newErrors.age = 'Please enter a valid age';
    }

    if (!gender) {
      newErrors.gender = 'Please select gender';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    if (validateForm()) {
      const newPatient: Patient = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        age: age.trim(),
        gender,
        registeredAt: new Date(),
      };

      onRegister(newPatient);
      Alert.alert('Success', 'Patient registered successfully!', [
        { text: 'OK', onPress: () => onBack() },
      ]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Register New Patient</Text>
      <Text style={styles.subtitle}>Enroll a patient to the system</Text>

      <View style={styles.formContainer}>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <TextInput
          style={[styles.input, errors.confirmPassword && styles.inputError]}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        {errors.confirmPassword && (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        )}

        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

        <TextInput
          style={[styles.input, errors.age && styles.inputError]}
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />
        {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}

        <Text style={styles.label}>Select Gender</Text>
        <View style={styles.genderContainer}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              gender === 'Male' && styles.genderButtonActive,
            ]}
            onPress={() => setGender('Male')}
          >
            <Text
              style={[
                styles.genderText,
                gender === 'Male' && styles.genderTextActive,
              ]}
            >
              Male
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.genderButton,
              gender === 'Female' && styles.genderButtonActive,
            ]}
            onPress={() => setGender('Female')}
          >
            <Text
              style={[
                styles.genderText,
                gender === 'Female' && styles.genderTextActive,
              ]}
            >
              Female
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.genderButton,
              gender === 'Other' && styles.genderButtonActive,
            ]}
            onPress={() => setGender('Other')}
          >
            <Text
              style={[
                styles.genderText,
                gender === 'Other' && styles.genderTextActive,
              ]}
            >
              Other
            </Text>
          </TouchableOpacity>
        </View>
        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register Patient</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default PatientRegistration;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 25,
    backgroundColor: '#f4f6f8',
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#7f8c8d',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 5,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 5,
    color: '#2c3e50',
  },
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  genderButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  genderTextActive: {
    color: '#fff',
  },
  button: {
    height: 50,
    backgroundColor: '#27ae60',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
