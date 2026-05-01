import { useEffect, useState, useCallback } from "react";
import ServiceCenterDashboard from "./service-center";
import { useAuth } from "@/contexts/auth-context";
import ServiceRequest from "./service-request";
import Scanner from "./scanner";
import ServiceSettings from "./settings";
import CreateRequest from "./create-request";
import ServiceDocuments from "./service-documents";
import BookingService from "./booking-service";

type TabMenu = 'data' | 'data-booking' | 'create-request' | 'service-center' | 'scan' | 'settings' | 'documents';

export default function ServiceDashboard() {
    const { user } = useAuth();
    const isSystem = user?.department.toLowerCase() === 'system';

    const getTabFromURL = useCallback((): TabMenu => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab') as TabMenu;
        const validTabs: TabMenu[] = ['data', 'create-request', 'service-center', 'scan', 'settings', 'documents', 'data-booking'];

        return validTabs.includes(tab) ? tab : 'create-request';
    }, []);

    const [activeMenu, setActiveMenuState] = useState<TabMenu>(getTabFromURL());
    const setActiveMenu = (newTab: TabMenu) => {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', newTab);

        window.history.pushState({}, '', url.toString());
        setActiveMenuState(newTab);
    };

    useEffect(() => {
        const handlePopState = () => {
            setActiveMenuState(getTabFromURL());
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [getTabFromURL]);

    const getBtnClass = (menu: TabMenu) =>
        `py-2 px-6 border-b-2 rounded-t-md transition-all ${activeMenu === menu
            ? 'border-(--z-red) text-white bg-(--z-red)'
            : 'border-gray-300 text-gray-500 hover:bg-gray-50'
        }`;

    return (
        <>
            <div className="flex">
                <button onClick={() => setActiveMenu('create-request')} className={getBtnClass('create-request')}>
                    Create Requests
                </button>
                <button onClick={() => setActiveMenu('data')} className={getBtnClass('data')}>
                    Service Requests
                </button>
                <button onClick={() => setActiveMenu('data-booking')} className={getBtnClass('data-booking')}>
                    Booking Service
                </button>
                {isSystem && (
                    <button onClick={() => setActiveMenu('documents')} className={getBtnClass('documents')}>
                        Documents
                    </button>
                )}
                <button onClick={() => setActiveMenu('scan')} className={getBtnClass('scan')}>
                    Scanner
                </button>

                {isSystem && (
                    <>
                        <button onClick={() => setActiveMenu('service-center')} className={getBtnClass('service-center')}>
                            Service Center
                        </button>
                        <button onClick={() => setActiveMenu('settings')} className={getBtnClass('settings')}>
                            Settings
                        </button>
                    </>
                )}
            </div>

            <section className="w-full h-[82vh] bg-white border border-gray-200 rounded-b-md shadow-sm overflow-y-auto thin-scrollbar">
                {activeMenu === 'data' && <ServiceRequest />}
                {activeMenu === 'data-booking' && <BookingService />}
                {activeMenu === 'create-request' && <CreateRequest />}
                {activeMenu === 'service-center' && <ServiceCenterDashboard />}
                {activeMenu === 'documents' && <ServiceDocuments />}
                {activeMenu === 'scan' && <Scanner />}
                {activeMenu === 'settings' && <ServiceSettings />}
            </section>
        </>
    );
}