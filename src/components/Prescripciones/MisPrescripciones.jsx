import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { handleApiError, getDatos, getStatusBadge, getStatusColor, formatDate } from '../../utils/crudHelpers';
import './Prescripciones.css';

export default function MisPrescripciones() {
  const { usuario } = useAuth();
  const idPaciente = usuario?.id_paciente;
  const [prescripciones, setPrescripciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      if (!idPaciente) {
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        const response = await client.get(`/api/prescripciones/paciente/${idPaciente}`);
        setPrescripciones(getDatos(response, []));
        setError(null);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [idPaciente]);

  if (!idPaciente) {
    return (
      <div className="lista-container">
        <div className="lista-vacia">
          <p>Tu cuenta todavÃ­a no estÃ¡ vinculada a una ficha de paciente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lista-container">
      <div className="lista-header">
        <h1>Mis recetas</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {cargando ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando recetas...</p>
        </div>
      ) : prescripciones.length === 0 ? (
        <div className="lista-vacia">
          <p>No tenÃ©s recetas registradas.</p>
        </div>
      ) : (
        <div className="tabla-container">
          <table className="tabla">
            <thead>
              <tr>
                <th>Medicamentos</th>
                <th>MÃ©dico</th>
                <th>Fecha EmisiÃ³n</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {prescripciones.map((prescripcion) => (
                <tr key={prescripcion.id}>
                  <td data-label="Medicamentos">
                    {(prescripcion.medicamentos || [])
                      .map((m) => `${m.nombre}${m.dosis ? ` (${m.dosis})` : ''}`)
                      .join(', ')}
                  </td>
                  <td data-label="MÃ©dico">{prescripcion.nombre_medico}</td>
                  <td data-label="Fecha EmisiÃ³n">{formatDate(prescripcion.fecha_emision)}</td>
                  <td data-label="Estado">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(prescripcion.estado) }}
                    >
                      {getStatusBadge(prescripcion.estado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

