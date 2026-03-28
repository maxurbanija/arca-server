import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { createClient, getClient, updateClient } from '../api/client';

interface ClientFormData {
  name: string;
  docType: number;
  docNumber: string;
  ivaCondition: number;
  address: string;
  email: string;
  phone: string;
}

export default function NewClient() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const isEditing = !!id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    defaultValues: {
      name: '',
      docType: 80,
      docNumber: '',
      ivaCondition: 1,
      address: '',
      email: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setFetching(true);
        const client = await getClient(Number(id));
        reset({
          name: client.name,
          docType: client.docType,
          docNumber: client.docNumber,
          ivaCondition: client.ivaCondition,
          address: client.address || '',
          email: client.email || '',
          phone: client.phone || '',
        });
      } catch {
        toast.error('Error al cargar el cliente');
        navigate('/clientes');
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [id, reset, navigate]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        docType: Number(data.docType),
        ivaCondition: Number(data.ivaCondition),
      };

      if (isEditing) {
        await updateClient(Number(id), payload);
        toast.success('Cliente actualizado');
      } else {
        await createClient(payload);
        toast.success('Cliente creado');
      }
      navigate('/clientes');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Error al guardar el cliente';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">Nombre / Razon Social *</label>
              <input
                type="text"
                {...register('name', { required: 'El nombre es requerido' })}
                className="input"
                placeholder="Juan Perez S.A."
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Document */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Tipo de Documento *</label>
                <select
                  {...register('docType', { valueAsNumber: true })}
                  className="select"
                >
                  <option value={80}>CUIT</option>
                  <option value={86}>CUIL</option>
                  <option value={96}>DNI</option>
                  <option value={99}>Consumidor Final</option>
                </select>
              </div>
              <div>
                <label className="label">Numero de Documento *</label>
                <input
                  type="text"
                  {...register('docNumber', {
                    required: 'El documento es requerido',
                  })}
                  className="input"
                  placeholder="20123456789"
                />
                {errors.docNumber && (
                  <p className="mt-1 text-xs text-red-600">{errors.docNumber.message}</p>
                )}
              </div>
            </div>

            {/* IVA Condition */}
            <div>
              <label className="label">Condicion frente al IVA *</label>
              <select
                {...register('ivaCondition', { valueAsNumber: true })}
                className="select"
              >
                <option value={1}>Responsable Inscripto</option>
                <option value={4}>Exento</option>
                <option value={5}>Consumidor Final</option>
                <option value={6}>Monotributista</option>
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="label">Domicilio</label>
              <input
                type="text"
                {...register('address')}
                className="input"
                placeholder="Av. Corrientes 1234, CABA"
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="input"
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <label className="label">Telefono</label>
                <input
                  type="text"
                  {...register('phone')}
                  className="input"
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/clientes')}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando...
              </>
            ) : isEditing ? (
              'Actualizar Cliente'
            ) : (
              'Crear Cliente'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
