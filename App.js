import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Modal,
  Button,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { openDatabase } from "expo-sqlite";
import Icon from "react-native-vector-icons/FontAwesome";

const db = openDatabase("events.db");

export default function App() {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    setupDatabase();
    refreshEvents();
  }, []);

  const setupDatabase = () => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, date TEXT, photo TEXT);"
      );
    });
  };

  const refreshEvents = () => {
    db.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM events",
        [],
        (_, { rows }) => {
          setEvents(rows._array);
        },
        (_, error) => {
          console.log("Error al obtener los eventos:", error);
        }
      );
    });
  };

  const addEvent = async () => {
    if (!title || !description) {
      alert("Por favor ingresa el título y la descripción del evento.");
      return;
    }
  
    const photo = await selectImage();
    
    const currentDate = new Date();
  const formattedDate = currentDate.getFullYear() + '-' + 
                        String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(currentDate.getDate()).padStart(2, '0') + ' ' +
                        String(currentDate.getHours()).padStart(2, '0') + ':' +
                        String(currentDate.getMinutes()).padStart(2, '0');
  
    db.transaction((tx) => {
      tx.executeSql(
        "INSERT INTO events (title, description, date, photo) VALUES (?, ?, ?, ?)",
        [title, description, formattedDate, photo],
        (_, result) => {
          setTitle("");
          setDescription("");
          setDate(new Date());
          refreshEvents();
        },
        (_, error) => {
          console.log("Error al insertar el evento:", error);
        }
      );
    });
  };

  const selectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      console.log("Permission to access camera roll denied");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.cancelled) {
      return result.assets[0].uri;
    }
  };

  const deleteEvent = (id) => {
    db.transaction((tx) => {
      tx.executeSql(
        "DELETE FROM events WHERE id = ?",
        [id],
        (_, result) => {
          refreshEvents();
        },
        (_, error) => {
          console.log("Error al eliminar el evento:", error);
        }
      );
    });
  };

  const editEvent = (event) => {
    setSelectedEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    setIsEditing(true);
    setEditId(event.id);
  };

  const updateEvent = () => {
    db.transaction((tx) => {
      tx.executeSql(
        "UPDATE events SET title = ?, description = ?, date = ? WHERE id = ?",
        [title, description, date.toISOString(), editId],
        (_, result) => {
          setTitle("");
          setDescription("");
          setDate(new Date());
          setIsEditing(false);
          setEditId(null);
          refreshEvents();
        },
        (_, error) => {
          console.log("Error al actualizar el evento:", error);
        }
      );
    });
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setModalVisible(false);
  };

  const renderEventItem = ({ item }) => (
    <>
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => {
            setSelectedEvent(item);
            setModalVisible(true);
          }}
        >
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventDescription}>{item.description}</Text>
          <Text style={styles.eventDate}>{item.date}</Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => deleteEvent(item.id)}>
            <Icon name="trash" size={30} color="red" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => editEvent(item)}>
            <Icon name="edit" size={30} color="blue" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <>
      <View style={styles.topBar}>
        <Text style={styles.title}>911</Text>
      </View>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Título del evento"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Descripción del evento"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        {isEditing ? (
          <TouchableOpacity onPress={updateEvent}>
            <Icon name="save" size={30} color="green" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={addEvent}>
            <Icon name="plus" size={30} color="blue" />
          </TouchableOpacity>
        )}
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id.toString()}
        />

        {selectedEvent && (
          <Modal
            animationType="slide"
            transparent={false}
            visible={modalVisible}
            onRequestClose={closeModal}
          >
            <View style={styles.modalContainer}>
              {selectedEvent.photo && (
                <Image
                  source={{ uri: selectedEvent.photo }}
                  style={styles.selectedEventPhoto}
                />
              )}
              <Text style={styles.selectedEventTitle}>
                {selectedEvent.title}
              </Text>
              <Text style={styles.selectedEventDescription}>
                {selectedEvent.description}
              </Text>
              <Text style={styles.selectedEventDate}>{selectedEvent.date}</Text>

              <Button title="Cerrar" onPress={closeModal} />
            </View>
          </Modal>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingTop: 50,
    backgroundColor: "#b64b48",
    height: "10%",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#5faab1",
  },
  container: {
    backgroundColor: "#5faab1",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    height: "90%",
  },
  card: {
    backgroundColor: "#e9beb8",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    width: "100%",
  },
  addButton: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  eventItem: {
    marginBottom: 20,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  eventDescription: {
    fontSize: 16,
    marginBottom: 5,
  },
  eventPhoto: {
    width: 200,
    height: 200,
    resizeMode: "cover",
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#5faab1",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  selectedEventTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  selectedEventDescription: {
    fontSize: 16,
    marginBottom: 10,
  },
  selectedEventDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  selectedEventPhoto: {
    width: 200,
    height: 200,
    resizeMode: "cover",
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
});
