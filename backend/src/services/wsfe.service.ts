import soap from 'soap';
import { config } from '../config';
import { wsaaService } from './wsaa.service';

interface AuthData {
  Token: string;
  Sign: string;
  Cuit: string;
}

interface AlicIva {
  Id: number;
  BaseImp: number;
  Importe: number;
}

export interface CAERequestData {
  CbteTipo: number;
  PtoVta: number;
  Concepto: number;
  DocTipo: number;
  DocNro: string;
  CbteDesde: number;
  CbteHasta: number;
  CbteFch: string;
  ImpTotal: number;
  ImpTotConc: number;
  ImpNeto: number;
  ImpOpEx: number;
  ImpIVA: number;
  ImpTrib: number;
  FchServDesde?: string;
  FchServHasta?: string;
  FchVtoPago?: string;
  MonId: string;
  MonCotiz: number;
  Iva: AlicIva[];
}

export interface CAEResponse {
  cae: string;
  caeFchVto: string;
  resultado: string;
  cbteDesde: number;
  cbteHasta: number;
  observaciones?: string;
  errores?: string;
}

interface LastVoucherResponse {
  CbteNro: number;
  PtoVta: number;
  CbteTipo: number;
}

class WsfeService {
  private soapClient: soap.Client | null = null;

  private async getAuth(): Promise<AuthData> {
    const { token, sign } = await wsaaService.getTicket();
    return {
      Token: token,
      Sign: sign,
      Cuit: config.afip.cuit,
    };
  }

  private async getClient(): Promise<soap.Client> {
    if (this.soapClient) {
      return this.soapClient;
    }

    try {
      this.soapClient = await soap.createClientAsync(config.afip.wsfeUrl, {
        namespaceArrayElements: false,
      });
      return this.soapClient;
    } catch (error: any) {
      throw new Error(`Failed to create WSFE SOAP client: ${error.message}`);
    }
  }

  async getLastVoucher(puntoVenta: number, cbteTipo: number): Promise<LastVoucherResponse> {
    try {
      const auth = await this.getAuth();
      const client = await this.getClient();

      const [result] = await client.FECompUltimoAutorizadoAsync({
        Auth: auth,
        PtoVta: puntoVenta,
        CbteTipo: cbteTipo,
      });

      const body = result?.FECompUltimoAutorizadoResult;

      if (body?.Errors?.Err) {
        const errors = Array.isArray(body.Errors.Err) ? body.Errors.Err : [body.Errors.Err];
        const errorMsg = errors.map((e: any) => `${e.Code}: ${e.Msg}`).join('; ');
        throw new Error(`WSFE error getting last voucher: ${errorMsg}`);
      }

      return {
        CbteNro: body?.CbteNro ?? 0,
        PtoVta: body?.PtoVta ?? puntoVenta,
        CbteTipo: body?.CbteTipo ?? cbteTipo,
      };
    } catch (error: any) {
      if (error.message.startsWith('WSFE error')) throw error;
      throw new Error(`Failed to get last voucher: ${error.message}`);
    }
  }

  async requestCAE(data: CAERequestData): Promise<CAEResponse> {
    try {
      const auth = await this.getAuth();
      const client = await this.getClient();

      const detRequest: any = {
        Concepto: data.Concepto,
        DocTipo: data.DocTipo,
        DocNro: data.DocNro,
        CbteDesde: data.CbteDesde,
        CbteHasta: data.CbteHasta,
        CbteFch: data.CbteFch,
        ImpTotal: data.ImpTotal,
        ImpTotConc: data.ImpTotConc,
        ImpNeto: data.ImpNeto,
        ImpOpEx: data.ImpOpEx,
        ImpIVA: data.ImpIVA,
        ImpTrib: data.ImpTrib,
        MonId: data.MonId,
        MonCotiz: data.MonCotiz,
      };

      // Add service dates for concepto 2 (servicios) and 3 (productos y servicios)
      if (data.Concepto === 2 || data.Concepto === 3) {
        detRequest.FchServDesde = data.FchServDesde;
        detRequest.FchServHasta = data.FchServHasta;
        detRequest.FchVtoPago = data.FchVtoPago;
      }

      // Add IVA array if there are items
      if (data.Iva && data.Iva.length > 0) {
        detRequest.Iva = {
          AlicIva: data.Iva,
        };
      }

      const requestBody = {
        Auth: auth,
        FeCAEReq: {
          FeCabReq: {
            CantReg: 1,
            PtoVta: data.PtoVta,
            CbteTipo: data.CbteTipo,
          },
          FeDetReq: {
            FECAEDetRequest: detRequest,
          },
        },
      };

      const [result] = await client.FECAESolicitarAsync(requestBody);
      const body = result?.FECAESolicitarResult;

      if (body?.Errors?.Err) {
        const errors = Array.isArray(body.Errors.Err) ? body.Errors.Err : [body.Errors.Err];
        const errorMsg = errors.map((e: any) => `${e.Code}: ${e.Msg}`).join('; ');
        throw new Error(`WSFE CAE request error: ${errorMsg}`);
      }

      const det = body?.FeDetResp?.FECAEDetResponse;
      const detItem = Array.isArray(det) ? det[0] : det;

      if (!detItem) {
        throw new Error('Empty response from WSFE FECAESolicitar');
      }

      let observaciones: string | undefined;
      if (detItem.Observaciones?.Obs) {
        const obs = Array.isArray(detItem.Observaciones.Obs)
          ? detItem.Observaciones.Obs
          : [detItem.Observaciones.Obs];
        observaciones = obs.map((o: any) => `${o.Code}: ${o.Msg}`).join('; ');
      }

      return {
        cae: detItem.CAE || '',
        caeFchVto: detItem.CAEFchVto || '',
        resultado: detItem.Resultado || '',
        cbteDesde: detItem.CbteDesde,
        cbteHasta: detItem.CbteHasta,
        observaciones,
      };
    } catch (error: any) {
      if (error.message.startsWith('WSFE')) throw error;
      throw new Error(`Failed to request CAE: ${error.message}`);
    }
  }

  async getInvoice(cbteTipo: number, cbteNro: number, puntoVenta: number): Promise<any> {
    try {
      const auth = await this.getAuth();
      const client = await this.getClient();

      const [result] = await client.FECompConsultarAsync({
        Auth: auth,
        FeCompConsReq: {
          CbteTipo: cbteTipo,
          CbteNro: cbteNro,
          PtoVta: puntoVenta,
        },
      });

      const body = result?.FECompConsultarResult;

      if (body?.Errors?.Err) {
        const errors = Array.isArray(body.Errors.Err) ? body.Errors.Err : [body.Errors.Err];
        const errorMsg = errors.map((e: any) => `${e.Code}: ${e.Msg}`).join('; ');
        throw new Error(`WSFE query error: ${errorMsg}`);
      }

      return body?.ResultGet || null;
    } catch (error: any) {
      if (error.message.startsWith('WSFE')) throw error;
      throw new Error(`Failed to get invoice from AFIP: ${error.message}`);
    }
  }

  async getInvoiceTypes(): Promise<any[]> {
    try {
      const auth = await this.getAuth();
      const client = await this.getClient();

      const [result] = await client.FEParamGetTiposCbteAsync({ Auth: auth });
      const body = result?.FEParamGetTiposCbteResult;

      if (body?.Errors?.Err) {
        const errors = Array.isArray(body.Errors.Err) ? body.Errors.Err : [body.Errors.Err];
        const errorMsg = errors.map((e: any) => `${e.Code}: ${e.Msg}`).join('; ');
        throw new Error(`WSFE error: ${errorMsg}`);
      }

      const tipos = body?.ResultGet?.CbteTipo;
      return Array.isArray(tipos) ? tipos : tipos ? [tipos] : [];
    } catch (error: any) {
      if (error.message.startsWith('WSFE')) throw error;
      throw new Error(`Failed to get invoice types: ${error.message}`);
    }
  }

  async getDocTypes(): Promise<any[]> {
    try {
      const auth = await this.getAuth();
      const client = await this.getClient();

      const [result] = await client.FEParamGetTiposDocAsync({ Auth: auth });
      const body = result?.FEParamGetTiposDocResult;

      if (body?.Errors?.Err) {
        const errors = Array.isArray(body.Errors.Err) ? body.Errors.Err : [body.Errors.Err];
        const errorMsg = errors.map((e: any) => `${e.Code}: ${e.Msg}`).join('; ');
        throw new Error(`WSFE error: ${errorMsg}`);
      }

      const tipos = body?.ResultGet?.DocTipo;
      return Array.isArray(tipos) ? tipos : tipos ? [tipos] : [];
    } catch (error: any) {
      if (error.message.startsWith('WSFE')) throw error;
      throw new Error(`Failed to get doc types: ${error.message}`);
    }
  }

  async getIvaTypes(): Promise<any[]> {
    try {
      const auth = await this.getAuth();
      const client = await this.getClient();

      const [result] = await client.FEParamGetTiposIvaAsync({ Auth: auth });
      const body = result?.FEParamGetTiposIvaResult;

      if (body?.Errors?.Err) {
        const errors = Array.isArray(body.Errors.Err) ? body.Errors.Err : [body.Errors.Err];
        const errorMsg = errors.map((e: any) => `${e.Code}: ${e.Msg}`).join('; ');
        throw new Error(`WSFE error: ${errorMsg}`);
      }

      const tipos = body?.ResultGet?.IvaTipo;
      return Array.isArray(tipos) ? tipos : tipos ? [tipos] : [];
    } catch (error: any) {
      if (error.message.startsWith('WSFE')) throw error;
      throw new Error(`Failed to get IVA types: ${error.message}`);
    }
  }

  async getConceptTypes(): Promise<any[]> {
    try {
      const auth = await this.getAuth();
      const client = await this.getClient();

      const [result] = await client.FEParamGetTiposConceptoAsync({ Auth: auth });
      const body = result?.FEParamGetTiposConceptoResult;

      if (body?.Errors?.Err) {
        const errors = Array.isArray(body.Errors.Err) ? body.Errors.Err : [body.Errors.Err];
        const errorMsg = errors.map((e: any) => `${e.Code}: ${e.Msg}`).join('; ');
        throw new Error(`WSFE error: ${errorMsg}`);
      }

      const tipos = body?.ResultGet?.ConceptoTipo;
      return Array.isArray(tipos) ? tipos : tipos ? [tipos] : [];
    } catch (error: any) {
      if (error.message.startsWith('WSFE')) throw error;
      throw new Error(`Failed to get concept types: ${error.message}`);
    }
  }

  async getOptionalTypes(): Promise<any[]> {
    try {
      const auth = await this.getAuth();
      const client = await this.getClient();

      const [result] = await client.FEParamGetTiposOpcionalAsync({ Auth: auth });
      const body = result?.FEParamGetTiposOpcionalResult;

      if (body?.Errors?.Err) {
        const errors = Array.isArray(body.Errors.Err) ? body.Errors.Err : [body.Errors.Err];
        const errorMsg = errors.map((e: any) => `${e.Code}: ${e.Msg}`).join('; ');
        throw new Error(`WSFE error: ${errorMsg}`);
      }

      const tipos = body?.ResultGet?.OpcionalTipo;
      return Array.isArray(tipos) ? tipos : tipos ? [tipos] : [];
    } catch (error: any) {
      if (error.message.startsWith('WSFE')) throw error;
      throw new Error(`Failed to get optional types: ${error.message}`);
    }
  }

  async getCurrencyTypes(): Promise<any[]> {
    try {
      const auth = await this.getAuth();
      const client = await this.getClient();

      const [result] = await client.FEParamGetTiposMonedasAsync({ Auth: auth });
      const body = result?.FEParamGetTiposMonedasResult;

      if (body?.Errors?.Err) {
        const errors = Array.isArray(body.Errors.Err) ? body.Errors.Err : [body.Errors.Err];
        const errorMsg = errors.map((e: any) => `${e.Code}: ${e.Msg}`).join('; ');
        throw new Error(`WSFE error: ${errorMsg}`);
      }

      const tipos = body?.ResultGet?.Moneda;
      return Array.isArray(tipos) ? tipos : tipos ? [tipos] : [];
    } catch (error: any) {
      if (error.message.startsWith('WSFE')) throw error;
      throw new Error(`Failed to get currency types: ${error.message}`);
    }
  }

  async getServerStatus(): Promise<{ AppServer: string; DbServer: string; AuthServer: string }> {
    try {
      const client = await this.getClient();
      const [result] = await client.FEDummyAsync({});
      const body = result?.FEDummyResult;

      return {
        AppServer: body?.AppServer || 'Unknown',
        DbServer: body?.DbServer || 'Unknown',
        AuthServer: body?.AuthServer || 'Unknown',
      };
    } catch (error: any) {
      throw new Error(`Failed to get WSFE server status: ${error.message}`);
    }
  }
}

export const wsfeService = new WsfeService();
