import { useContext } from 'react';
// Importa useContext, el hook de React que permite consumir un Context (creado con createContext)
import { AuthContext } from '../context/AuthContext.jsx';
// Importa el AuthContext exportado por AuthContext.jsx (el contenedor del estado de sesión y sus métodos)

export const useAuth = () => {
  // useAuth: hook personalizado que expone el estado de autenticación de forma cómoda para cualquier componente
  const context = useContext(AuthContext);
  // useContext(AuthContext): obtiene el valor inyectado por <AuthContext.Provider> (usuario, token, login, logout, etc.)
  
  if (!context) {
    // Guardia: si el hook se usa fuera del árbol del AuthProvider, context sería undefined...
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
    // ...en ese caso se lanza un error claro para que el desarrollador ubique el problema al instante
  }
  
  return context;
  // Si el contexto existe, se devuelve el objeto completo con el estado y los métodos de autenticación
};