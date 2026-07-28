export const TENANT_FIRESTORE_RULES = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function userPath() {
      return /databases/$(database)/documents/usuarios/$(request.auth.uid);
    }

    function profile() {
      return get(userPath()).data;
    }

    function activeUser() {
      return signedIn() && exists(userPath()) && profile().activo == true;
    }

    function isAdmin() {
      return activeUser() && profile().role in ['SUPERADMIN', 'ADMIN'];
    }

    function isEmployee() {
      return activeUser() && profile().role == 'EMPLEADO';
    }

    function bootstrapOwner() {
      return signedIn()
        && getAfter(/databases/$(database)/documents/configuracion/system).data.ownerUid
          == request.auth.uid;
    }

    match /configuracion/system {
      allow get: if activeUser();
      allow create: if signedIn()
        && !exists(/databases/$(database)/documents/configuracion/system)
        && request.resource.data.ownerUid == request.auth.uid;
      allow update, delete: if false;
    }

    match /usuarios/{userId} {
      allow get: if activeUser()
        && (request.auth.uid == userId || isAdmin());
      allow list: if isAdmin();
      allow create: if (
          request.auth.uid == userId
          && bootstrapOwner()
          && request.resource.data.role == 'SUPERADMIN'
        ) || (
          isAdmin()
          && request.resource.data.role in ['ADMIN', 'EMPLEADO']
        );
      allow update: if isAdmin()
        && resource.data.role != 'SUPERADMIN'
        && request.resource.data.role in ['ADMIN', 'EMPLEADO'];
      allow delete: if false;
    }

    match /ferias/{feriaId} {
      allow read, create, update: if isAdmin();
      allow delete: if false;
    }

    match /tickets/{ticketId} {
      allow get: if activeUser();
      allow list, create: if isAdmin();
      allow update: if isAdmin() || (
        isEmployee()
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['usos', 'agotado'])
        && resource.data.estado == 'ACTIVO'
        && resource.data.agotado != true
        && request.resource.data.usos == resource.data.usos + 1
        && request.resource.data.usos <= resource.data.cantidad_inicial
        && request.resource.data.agotado
          == (request.resource.data.usos >= resource.data.cantidad_inicial)
      );
      allow delete: if false;
    }

    match /counters/{counterId} {
      allow read, create, update: if isAdmin() || bootstrapOwner();
      allow delete: if false;
    }

    match /consumos/{consumoId} {
      allow create: if activeUser()
        && request.resource.data.empleadoUid == request.auth.uid;
      allow read: if isAdmin();
      allow update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

